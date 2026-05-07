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
//
// Security rationale:
//   requestedBy is set from request auth, not from client payload, to prevent
//   a malicious client from impersonating the requester.
//
// Reference: ARCHITECTURE.md §4, F3 scope.

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
}, "friendships");
