// pb_hooks/on-session-create.js
// Fires when a new study_sessions record is being created (model-layer hook).
//
// Responsibility:
//   - Set startedAt to the current server time, overriding whatever the client
//     sent. This prevents clock skew and client-side manipulation.
//   - Set durationSec default to 0 if not provided.
//
// Security rationale (ARCHITECTURE.md §10):
//   Client clocks cannot be trusted for session bookkeeping. The server must
//   own the startedAt timestamp so that session duration calculations are
//   authoritative. On stop, the client sends durationSec as (now - startedAt)
//   minus paused time — that value is accepted because the server controls the
//   reference startedAt.
//
// Reference: ARCHITECTURE.md §6.2, F2 scope.

/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
  // Override startedAt with server-side UTC timestamp
  e.record.set("startedAt", new Date().toISOString());

  // Ensure durationSec defaults to 0
  if (e.record.get("durationSec") == null) {
    e.record.set("durationSec", 0);
  }

  e.next();
}, "study_sessions");
