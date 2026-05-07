// Migration 002 — Create the "study_sessions" collection
//
// What this WILL do in F1/F2:
//   - Create a new base collection `study_sessions`
//   - Fields: user (relation→users, cascade), mode (select: pomodoro | stopwatch | countdown),
//     startedAt (datetime), endedAt (datetime, nullable), durationSec (number, default 0),
//     pomodoroConfig (json, nullable), targetSec (number, nullable), notes (text, nullable)
//   - API rules: read = owner or accepted friend; create/update/delete = owner only
//
// See ARCHITECTURE.md §4 for the full schema and §6.2 for the timer flow.
// This file is a stub — real collection creation happens in F2.

migrate(
  (db) => {
    // TODO: F2 — create study_sessions collection with fields and API rules
  },
  (db) => {
    // TODO: F2 — down: delete study_sessions collection
  }
);
