// Migration 005 — Create the "challenge_participants" collection
//
// What this WILL do in F4:
//   - Create a new base collection `challenge_participants`
//   - Fields: challenge (relation→challenges, cascade), user (relation→users, cascade),
//     joinedAt (datetime), progressSec (number, default 0), streakDays (number, default 0)
//   - Unique constraint on (challenge, user)
//   - progressSec is updated by pb_hooks/on-session-end.js (F4) when a study session closes
//   - streakDays is managed by pb_hooks/crons.js daily rollup (F4)
//   - API rules: read = participants of the same challenge; create = authenticated (join);
//     update = hook only (via admin token)
//
// See ARCHITECTURE.md §4 for the full schema and §6.3 for progress tracking logic.
// This file is a stub — real collection creation happens in F4.

migrate(
  (db) => {
    // TODO: F4 — create challenge_participants collection with unique constraint and API rules
  },
  (db) => {
    // TODO: F4 — down: delete challenge_participants collection
  }
);
