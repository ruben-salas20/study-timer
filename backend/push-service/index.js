// push-service/index.js — Web Push dispatcher microservice
//
// Responsibilities:
//   POST /dispatch — receive a userId + payload, look up all push_subscriptions
//                    for that user, and send a web push notification to each.
//                    On 410/404 from the push provider, auto-removes the stale
//                    subscription from PocketBase.
//   GET  /health   — simple liveness probe for Docker/Caddy health checks.
//
// Authentication:
//   All POST /dispatch calls must include: Authorization: Bearer <PUSH_SERVICE_TOKEN>
//   This shared secret prevents unauthorized parties from triggering pushes.
//
// VAPID:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT must be set via env.
//   Generate with: npx web-push generate-vapid-keys
//
// Environment variables (see .env.example):
//   VAPID_PUBLIC_KEY      — base64-url VAPID public key
//   VAPID_PRIVATE_KEY     — base64-url VAPID private key (SECRET)
//   VAPID_SUBJECT         — mailto: or https: contact URL
//   POCKETBASE_URL        — PocketBase API base URL (default: http://localhost:8090)
//   PUSH_SERVICE_TOKEN    — shared secret for /dispatch authentication (SECRET)
//   PORT                  — HTTP port (default: 3001)

import "dotenv/config";
import express from "express";
import webpush from "web-push";
import PocketBase from "pocketbase";

// ── Configuration ──────────────────────────────────────────────────────────

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  POCKETBASE_URL = "http://localhost:8090",
  PUSH_SERVICE_TOKEN,
  PORT = "3001",
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  console.error(
    "[push-service] FATAL: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must be set."
  );
  process.exit(1);
}

if (!PUSH_SERVICE_TOKEN) {
  console.error("[push-service] FATAL: PUSH_SERVICE_TOKEN must be set.");
  process.exit(1);
}

// Configure web-push VAPID details
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── PocketBase client ──────────────────────────────────────────────────────

// Uses admin-level access via the POCKETBASE_URL — hooks call us with userId,
// we look up subscriptions in push_subscriptions using an admin token or
// open collection rules. Since push_subscriptions listRule requires auth,
// we use a PocketBase admin client authenticated at startup.
//
// For simplicity in F6, push_subscriptions are queried as superuser via
// PocketBase's admin API. The POCKETBASE_ADMIN_EMAIL/PASSWORD or
// POCKETBASE_ADMIN_TOKEN env can be used when available. If not set,
// we rely on the collection being accessible without auth (not recommended
// for prod — see README).
const pb = new PocketBase(POCKETBASE_URL);

// ── Express app ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Auth middleware ─────────────────────────────────────────────────────────

/**
 * requireServiceToken — verifies Authorization: Bearer <PUSH_SERVICE_TOKEN>.
 * Rejects with 401 if missing or wrong.
 */
function requireServiceToken(req, res, next) {
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== PUSH_SERVICE_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /health — liveness probe.
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /dispatch — send push notifications to all subscriptions for a user.
 *
 * Body:
 *   { userId: string, payload: { title: string, body: string, url?: string, tag?: string } }
 *
 * Returns:
 *   { sent: number, removed: number }
 */
app.post("/dispatch", requireServiceToken, async (req, res) => {
  const { userId, payload } = req.body ?? {};

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId is required" });
  }
  if (!payload?.title) {
    return res.status(400).json({ error: "payload.title is required" });
  }

  let subscriptions = [];
  try {
    // Fetch all push subscriptions for this user.
    // push_subscriptions listRule allows the owner only, so we need admin access.
    // We authenticate as superuser using PocketBase's admin API if token provided.
    const pbAdminToken = process.env.POCKETBASE_ADMIN_TOKEN ?? "";
    if (pbAdminToken) {
      pb.authStore.save(pbAdminToken, null);
    }

    subscriptions = await pb.collection("push_subscriptions").getFullList({
      filter: `user = "${userId}"`,
    });
  } catch (err) {
    console.error("[push-service] Failed to fetch subscriptions:", err);
    return res.status(500).json({ error: "Failed to fetch subscriptions" });
  }

  let sent = 0;
  let removed = 0;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
    tag: payload.tag ?? "study-timer",
  });

  const sendPromises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, notificationPayload);
      sent++;
    } catch (err) {
      const statusCode = err?.statusCode;

      if (statusCode === 410 || statusCode === 404) {
        // Subscription is gone — remove from PocketBase
        console.log(
          `[push-service] Removing stale subscription ${sub.id} (HTTP ${statusCode})`
        );
        try {
          await pb.collection("push_subscriptions").delete(sub.id);
          removed++;
        } catch (deleteErr) {
          console.error(
            `[push-service] Failed to delete stale subscription ${sub.id}:`,
            deleteErr
          );
        }
      } else {
        console.error(
          `[push-service] Failed to send notification to ${sub.endpoint}:`,
          err?.message ?? err
        );
      }
    }
  });

  await Promise.allSettled(sendPromises);

  console.log(
    `[push-service] Dispatched for user ${userId}: sent=${sent}, removed=${removed}`
  );
  return res.json({ sent, removed });
});

// ── Start ───────────────────────────────────────────────────────────────────

const port = parseInt(PORT, 10);
app.listen(port, () => {
  console.log(`[push-service] Listening on port ${port}`);
  console.log(`[push-service] PocketBase URL: ${POCKETBASE_URL}`);
});

export default app;
