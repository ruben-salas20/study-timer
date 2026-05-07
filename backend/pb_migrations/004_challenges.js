// Migration 004 — Create the "challenges" collection
//
// What this WILL do in F4:
//   - Create a new base collection `challenges`
//   - Fields: createdBy (relation→users), type (select: race | weekly_goal | duel | group_streak),
//     title (text), description (text, nullable), startsAt (datetime), endsAt (datetime),
//     targetSec (number, nullable), targetDays (number, nullable),
//     prizeWinner (text), prizeLoser (text, nullable),
//     status (select: pending | active | completed | cancelled, default "pending")
//   - API rules: read = participants only; create = authenticated; edit = creator before active
//
// See ARCHITECTURE.md §4 for the full schema and §6.3 for challenge types (race, weekly_goal,
// duel, group_streak).
// This file is a stub — real collection creation happens in F4.

migrate(
  (db) => {
    // TODO: F4 — create challenges collection with fields and API rules
  },
  (db) => {
    // TODO: F4 — down: delete challenges collection
  }
);
