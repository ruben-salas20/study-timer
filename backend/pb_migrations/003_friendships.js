// Migration 003 — Create the "friendships" collection
//
// What this WILL do in F3:
//   - Create a new base collection `friendships`
//   - Fields: userA (relation→users), userB (relation→users),
//     status (select: pending | accepted | blocked, default "pending"),
//     requestedBy (relation→users)
//   - Unique constraint on (min(userA,userB), max(userA,userB)) to prevent duplicate pairs
//   - API rules: read = participants only; create = authenticated users (via friendCode lookup);
//     update (accept/block) = recipient only
//
// See ARCHITECTURE.md §4 for the full schema and §6.1 for the friend flow.
// This file is a stub — real collection creation happens in F3.

migrate(
  (db) => {
    // TODO: F3 — create friendships collection with unique pair constraint and API rules
  },
  (db) => {
    // TODO: F3 — down: delete friendships collection
  }
);
