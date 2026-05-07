// pb_hooks/on-friendship-create.pb.js
// Fires when a new friendships record is being created.
//
// IMPORTANT: goja JSVM isolates callback scope from module top-level.
// All helpers MUST live inside the callback.

/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
  // ── Inline helpers ─────────────────────────────────────────────────────

  function dispatchPush(app, userId, payload) {
    try {
      const pushServiceUrl = $os.getenv("PUSH_SERVICE_URL") || "http://push-service:3001";
      const pushServiceToken = $os.getenv("PUSH_SERVICE_TOKEN") || "";
      if (!pushServiceToken) return;

      $http.send({
        url: `${pushServiceUrl}/dispatch`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pushServiceToken}`,
        },
        body: JSON.stringify({ userId, payload }),
        timeout: 5,
      });
    } catch (err) {
      console.error("[on-friendship-create] dispatchPush error:", err);
    }
  }

  // ── Validate + normalize ───────────────────────────────────────────────

  const authId = e.requestInfo().auth?.id;
  if (!authId) {
    throw new BadRequestError("Authentication required");
  }

  let userA = e.record.get("userA");
  let userB = e.record.get("userB");

  if (userA === userB) {
    throw new BadRequestError("Cannot add yourself as a friend");
  }

  // Override requestedBy server-side
  e.record.set("requestedBy", authId);

  // Canonical ordering: userA < userB lexicographically
  if (userA > userB) {
    const tmp = userA;
    userA = userB;
    userB = tmp;
    e.record.set("userA", userA);
    e.record.set("userB", userB);
  }

  // Duplicate check
  let duplicateExists = false;
  try {
    e.app.findFirstRecordByFilter(
      "friendships",
      "userA = {:userA} && userB = {:userB}",
      { userA: userA, userB: userB }
    );
    duplicateExists = true;
  } catch (_) {
    // not found is expected
  }
  if (duplicateExists) {
    throw new BadRequestError("A friendship between these users already exists");
  }

  e.next();

  // ── Best-effort push notification (after persistence) ──────────────────

  try {
    const requestedBy = e.record.get("requestedBy");
    const targetUserId = userA === requestedBy ? userB : userA;

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
  } catch (err) {
    console.error("[on-friendship-create] notification step failed:", err);
  }
}, "friendships");
