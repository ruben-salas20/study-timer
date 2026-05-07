// pb_hooks/notifications.js — Push notification helper
//
// Exports dispatchPush(app, userId, payload) — sends an HTTP POST to the
// push-service microservice. This is the ONLY way PocketBase hooks should
// trigger push notifications.
//
// Design decisions:
//   1. All push logic is centralised here — hooks just call dispatchPush().
//   2. The call is wrapped in try/catch — a push failure NEVER blocks the
//      main PocketBase operation. Push is best-effort.
//   3. PUSH_SERVICE_URL and PUSH_SERVICE_TOKEN are read from the PocketBase
//      process environment via $os.getenv() (available in goja hooks runtime).
//   4. Uses $http.send() — the built-in HTTP client in PocketBase hooks.
//      This avoids any npm dependency (goja cannot require npm packages).
//
// Usage in other hooks:
//   const { dispatchPush } = require('./notifications')   // if require() available
//   — OR — inline this helper if require() is not supported.
//
// Reference: ARCHITECTURE.md §4, F6 scope.

/// <reference path="../pb_data/types.d.ts" />

/**
 * dispatchPush — fire a push notification for a user.
 *
 * @param {object} app        - The $app global from PocketBase hooks
 * @param {string} userId     - PocketBase user record ID
 * @param {{ title: string, body?: string, url?: string, tag?: string }} payload
 */
function dispatchPush(app, userId, payload) {
  try {
    const pushServiceUrl = $os.getenv("PUSH_SERVICE_URL") || "http://push-service:3001";
    const pushServiceToken = $os.getenv("PUSH_SERVICE_TOKEN") || "";

    if (!pushServiceToken) {
      console.warn("[notifications] PUSH_SERVICE_TOKEN not set — skipping push");
      return;
    }

    const response = $http.send({
      url: `${pushServiceUrl}/dispatch`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pushServiceToken}`,
      },
      body: JSON.stringify({ userId, payload }),
      timeout: 5, // 5 seconds max — don't block hooks
    });

    if (response.statusCode >= 400) {
      console.error(
        `[notifications] push-service returned ${response.statusCode} for user ${userId}:`,
        response.raw
      );
    } else {
      console.log(
        `[notifications] Push dispatched for user ${userId}: ${response.raw}`
      );
    }
  } catch (err) {
    // Never let push failure propagate to the calling hook
    console.error("[notifications] Failed to dispatch push notification:", err);
  }
}
