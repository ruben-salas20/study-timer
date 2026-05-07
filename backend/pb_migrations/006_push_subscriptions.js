// Migration 006 — Create the "push_subscriptions" collection
//
// What this WILL do in F6:
//   - Create a new base collection `push_subscriptions`
//   - Fields: user (relation→users, cascade), endpoint (url text), p256dh (text),
//     auth (text), userAgent (text)
//   - Stores Web Push subscription objects sent by the browser after permission is granted
//   - Read/write by owner only; delete on user delete (cascade)
//   - Used by the Node push-service (backend/push-service/) to dispatch VAPID-signed
//     notifications via the web-push npm package
//
// See ARCHITECTURE.md §4 for the full schema, §6.5 for the push flow, and
// backend/push-service/README.md for the microservice design.
// This file is a stub — real collection creation happens in F6.

migrate(
  (db) => {
    // TODO: F6 — create push_subscriptions collection with API rules
  },
  (db) => {
    // TODO: F6 — down: delete push_subscriptions collection
  }
);
