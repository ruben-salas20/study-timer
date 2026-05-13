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
// PocketBase access:
//   The push_subscriptions collection is owner-only (listRule). To read every
//   user's subs, push-service authenticates as a SUPERUSER at startup.
//   Preferred env vars:
//     POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD — self-healing,
//       re-authenticates on token expiry.
//   Legacy fallback:
//     POCKETBASE_ADMIN_TOKEN — static token; will stop working when PB rotates
//       or the token expires. Only used if email/password aren't provided.
//
// VAPID:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT must be set via env.
//   Generate with: npx web-push generate-vapid-keys

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
  POCKETBASE_ADMIN_EMAIL,
  POCKETBASE_ADMIN_PASSWORD,
  POCKETBASE_ADMIN_TOKEN,
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

if (!POCKETBASE_ADMIN_EMAIL && !POCKETBASE_ADMIN_TOKEN) {
  console.warn(
    "[push-service] WARNING: Neither POCKETBASE_ADMIN_EMAIL nor POCKETBASE_ADMIN_TOKEN " +
    "is set. push_subscriptions queries will return empty (owner-only listRule) " +
    "and every dispatch will report sent=0. Set POCKETBASE_ADMIN_EMAIL + " +
    "POCKETBASE_ADMIN_PASSWORD for self-healing auth."
  );
}

// Configure web-push VAPID details
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── PocketBase client ──────────────────────────────────────────────────────

const pb = new PocketBase(POCKETBASE_URL);

/**
 * authenticate — establish a superuser session on the shared `pb` client.
 * Tries email/password first (preferred, self-healing). Falls back to a
 * static token if only that's available. Logs and re-throws on failure so
 * callers can decide whether to retry or abort.
 */
async function authenticate() {
  if (POCKETBASE_ADMIN_EMAIL && POCKETBASE_ADMIN_PASSWORD) {
    await pb
      .collection("_superusers")
      .authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD);
    console.log(
      `[push-service] Authenticated as superuser ${POCKETBASE_ADMIN_EMAIL}`
    );
    return;
  }
  if (POCKETBASE_ADMIN_TOKEN) {
    pb.authStore.save(POCKETBASE_ADMIN_TOKEN, null);
    console.log("[push-service] Using static POCKETBASE_ADMIN_TOKEN");
    return;
  }
  throw new Error("No admin credentials available");
}

/**
 * fetchUserSubscriptions — list push subscriptions for a user, transparently
 * re-authenticating once if the token has expired or was lost.
 */
async function fetchUserSubscriptions(userId) {
  async function query() {
    return pb
      .collection("push_subscriptions")
      .getFullList({ filter: `user = "${userId}"` });
  }

  try {
    return await query();
  } catch (err) {
    // 401 here is almost always a stale token. Try a single re-auth + retry
    // so a long-running service can survive a TTL expiry without manual ops.
    if (err?.status === 401 && POCKETBASE_ADMIN_EMAIL && POCKETBASE_ADMIN_PASSWORD) {
      console.warn("[push-service] 401 fetching subs — re-authenticating…");
      try {
        await authenticate();
        return await query();
      } catch (retryErr) {
        console.error(
          "[push-service] Re-auth or retry failed:",
          retryErr?.message ?? retryErr
        );
        throw retryErr;
      }
    }
    throw err;
  }
}

// ── Express app ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

function requireServiceToken(req, res, next) {
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== PUSH_SERVICE_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Routes ─────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", authenticated: pb.authStore.isValid });
});

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
    subscriptions = await fetchUserSubscriptions(userId);
  } catch (err) {
    console.error("[push-service] Failed to fetch subscriptions:", err);
    return res.status(500).json({ error: "Failed to fetch subscriptions" });
  }

  if (subscriptions.length === 0) {
    console.log(
      `[push-service] Dispatched for user ${userId}: sent=0, removed=0 (no subscriptions)`
    );
    return res.json({ sent: 0, removed: 0, reason: "no_subscriptions" });
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

(async () => {
  // Authenticate at startup. If it fails we still listen so /health works
  // and the dispatch route can attempt re-auth on first request.
  try {
    await authenticate();
  } catch (err) {
    console.error(
      "[push-service] Startup authentication failed — dispatches will fail until creds are valid:",
      err?.message ?? err
    );
  }

  app.listen(port, () => {
    console.log(`[push-service] Listening on port ${port}`);
    console.log(`[push-service] PocketBase URL: ${POCKETBASE_URL}`);
  });
})();

export default app;
