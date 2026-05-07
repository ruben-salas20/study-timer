// pb_hooks/on-friendship-create.pb.js
// Two-stage hook for friendships:
//   1. onRecordCreateRequest: BEFORE validation, set requestedBy from auth,
//      reject self-friendship, normalise pair order, reject duplicates.
//   2. onRecordCreate: AFTER successful create, dispatch push notification.
//
// IMPORTANT:
//   - PocketBase only loads `.pb.js` files; plain `.js` is ignored.
//   - goja JSVM isolates each callback's scope from module top-level.
//   - `e.requestInfo()` is ONLY available on Request-layer hooks
//     (onRecordCreateRequest), NOT on model-layer hooks (onRecordCreate).

/// <reference path="../pb_data/types.d.ts" />

// Stage 1 — Request layer: validate + normalise the incoming friendship.
onRecordCreateRequest((e) => {
  const authId = e.requestInfo().auth?.id;
  if (!authId) {
    throw new BadRequestError("Authentication required");
  }

  let userA = e.record.get("userA");
  let userB = e.record.get("userB");

  if (userA === userB) {
    throw new BadRequestError("Cannot add yourself as a friend");
  }

  // Force requestedBy to the auth user — never trust the client.
  e.record.set("requestedBy", authId);

  // Canonical ordering: userA < userB lexicographically so the (userA, userB)
  // composite key is deterministic regardless of who initiated the request.
  if (userA > userB) {
    const tmp = userA;
    userA = userB;
    userB = tmp;
    e.record.set("userA", userA);
    e.record.set("userB", userB);
  }

  // Duplicate check
  let duplicate = false;
  try {
    e.app.findFirstRecordByFilter(
      "friendships",
      "userA = {:userA} && userB = {:userB}",
      { userA: userA, userB: userB }
    );
    duplicate = true;
  } catch (_) {
    // not found — expected happy path
  }
  if (duplicate) {
    throw new BadRequestError("A friendship between these users already exists");
  }

  e.next();
}, "friendships");

// Stage 2 — Model layer: best-effort push notification AFTER persistence.
onRecordCreate((e) => {
  e.next();

  // Inline helper (goja JSVM scope isolation)
  function dispatchPush(userId, payload) {
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

  try {
    const requestedBy = e.record.get("requestedBy");
    const userA = e.record.get("userA");
    const userB = e.record.get("userB");
    const targetUserId = userA === requestedBy ? userB : userA;

    let requesterName = "Alguien";
    try {
      const requester = e.app.findRecordById("users", requestedBy);
      requesterName = requester.get("displayName") || requesterName;
    } catch (_) { /* not critical */ }

    dispatchPush(targetUserId, {
      title: "Nueva solicitud de amistad",
      body: `${requesterName} te quiere agregar como amigo`,
      url: "/friends",
      tag: "friend-request",
    });
  } catch (err) {
    console.error("[on-friendship-create] notification step failed:", err);
  }
}, "friendships");
