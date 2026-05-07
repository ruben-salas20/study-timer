// pb_hooks/on-session-end.js
// Fires after a study_sessions record is updated (model-layer hook).
//
// Responsibility:
//   - Detect when a session was just ended (endedAt transitioned null → non-null)
//   - Find all active challenges where this user is a participant
//   - For race / weekly_goal / duel: increment progressSec by session's durationSec
//
// group_streak note:
//   For F4, streakDays is NOT mutated here. It is computed on-demand by frontend
//   selectors from the user's session list. This avoids race conditions and keeps
//   F4 shippable. See F4 scope in ARCHITECTURE.md §4.
//
// Security rationale:
//   Only sessions with a valid durationSec (> 0) and a fresh endedAt are processed.
//   The session's userId is taken from the server record, not the client request,
//   preventing progress inflation by spoofed user ids.
//
// Reference: ARCHITECTURE.md §4, F4 scope.

/// <reference path="../pb_data/types.d.ts" />

onRecordUpdate((e) => {
  // Only react when endedAt was just set (null → non-null)
  const prevEndedAt = e.record.original().get("endedAt");
  const newEndedAt = e.record.get("endedAt");

  if (!newEndedAt || prevEndedAt) {
    // Session not freshly ended — skip
    e.next();
    return;
  }

  e.next();

  const durationSec = Number(e.record.get("durationSec") ?? 0);
  if (durationSec <= 0) return;

  const userId = e.record.get("user");
  if (!userId) return;

  try {
    // Find all challenge_participants for this user whose challenge is active
    const participantRecords = e.app.findAllRecords("challenge_participants",
      e.app.query()
        .andWhere(
          e.app.newExpr("user = {:userId}", { userId })
        )
        .andWhere(
          e.app.newExpr(
            "challenge IN (SELECT id FROM challenges WHERE status = 'active')"
          )
        )
    );

    for (const participant of participantRecords) {
      // Resolve challenge type
      const challengeId = participant.get("challenge");
      let challengeType = "";

      try {
        const challenge = e.app.findRecordById("challenges", challengeId);
        challengeType = challenge.get("type");
      } catch {
        continue; // Challenge not found — skip
      }

      // Only increment progressSec for timed types
      if (challengeType === "race" || challengeType === "weekly_goal" || challengeType === "duel") {
        const currentProgress = Number(participant.get("progressSec") ?? 0);
        participant.set("progressSec", currentProgress + durationSec);

        try {
          e.app.save(participant);
        } catch (saveErr) {
          console.error(
            `[on-session-end] Failed to update progressSec for participant ${participant.id}:`,
            saveErr
          );
        }
      }
      // group_streak: computed on-demand in frontend — no mutation here (F4)
    }
  } catch (err) {
    console.error("[on-session-end] Error processing challenge progress:", err);
  }
}, "study_sessions");
