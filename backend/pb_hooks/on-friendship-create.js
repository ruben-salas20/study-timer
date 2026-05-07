// pb_hooks/on-friendship-create.js
// Fires when a new friendships record is being created (model-layer hook).
//
// Responsibilities:
//   1. Reject self-friendship: userA == userB → throw error.
//   2. Override requestedBy with the authenticated user — don't trust client.
//   3. Normalise pair order: ensure userA < userB lexicographically.
//      This canonical form means the composite key (userA, userB) is always
//      deterministic, regardless of which side of the friendship initiates.
//   4. Duplicate check: if a friendship record already exists between the
//      normalised pair (any status), throw "duplicate friendship".
//      PocketBase 0.23 does not have composite unique on relation fields,
//      so we enforce it here in the hook.
//   5. [F6] Push notification: notify the target user of the friend request.
//      The notification is best-effort — failure never blocks the hook.
//
// Security rationale:
//   requestedBy is set from request auth, not from client payload, to prevent
//   a malicious client from impersonating the requester.
//
// Reference: ARCHITECTURE.md §4, F3/F6 scope.

/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
  const authId = e.requestInfo().auth?.id;

  if (!authId) {
    throw new BadRequestError("Authentication required");
  }

  let userA = e.record.get("userA");
  let userB = e.record.get("userB");

  // 1. Reject self-friendship
  if (userA === userB) {
    throw new BadRequestError("Cannot add yourself as a friend");
  }

  // 2. Override requestedBy with the server-side auth identity
  e.record.set("requestedBy", authId);

  // 3. Normalise pair to ensure userA < userB lexicographically
  if (userA > userB) {
    const tmp = userA;
    userA = userB;
    userB = tmp;
    e.record.set("userA", userA);
    e.record.set("userB", userB);
  }

  // 4. Check for existing friendship between this pair (any status)
  try {
    e.app.findFirstRecordByFilter(
      "friendships",
      `userA = {:userA} && userB = {:userB}`,
      { userA: userA, userB: userB }
    );
    // If we reach here, a record was found → duplicate
    throw new BadRequestError("A friendship between these users already exists");
  } catch (err) {
    // findFirstRecordByFilter throws when no record is found — that's OK
    // Re-throw only if it's our own BadRequestError (duplicate case)
    if (err instanceof BadRequestError) {
      throw err;
    }
    // Not found → proceed (this is the expected happy path)
  }

  e.next();

  // [F6] Push notification — notify the target user of the friend request.
  // The target is whichever of userA/userB is NOT the requestedBy.
  // Wrapped in try/catch so push failure never throws inside a model hook.
  try {
    const requestedBy = e.record.get("requestedBy");
    const targetUserId = userA === requestedBy ? userB : userA;

    // Fetch the requester's displayName for the notification body
    let requesterName = "Alguien";
    try {
      const requester = e.app.findRecordById("users", requestedBy);
      requesterName = requester.get("displayName") || requesterName;
    } catch (_) { /* not critical */ }

    dispatchPush(e.app, targetUserId, {
      title: "Nueva solicitud de amistad",
      body: `${requesterName} te quiere agregar como amigo`,
      url: "/friends",
      tag: "friend-request",
    });
  } catch (pushErr) {
    console.error("[on-friendship-create] Push notification failed:", pushErr);
  }
}, "friendships");

// ── Push helper (inline — goja does not support require() for local modules) ──

/**
 * dispatchPush — fire a push notification for a user via the push-service.
 * Best-effort: errors are logged but never re-thrown.
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
      timeout: 5,
    });

    if (response.statusCode >= 400) {
      console.error(
        `[notifications] push-service returned ${response.statusCode} for user ${userId}:`,
        response.raw
      );
    }
  } catch (err) {
    console.error("[notifications] Failed to dispatch push notification:", err);
  }
}
