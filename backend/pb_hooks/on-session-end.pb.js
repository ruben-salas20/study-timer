// pb_hooks/on-session-end.pb.js
// Fires after a study_sessions record is updated.
//
// Responsibility:
//   - Detect when a session was just ended (endedAt transitioned null → non-null)
//   - Find all active challenges where this user is a participant
//   - For race / weekly_goal / duel: increment progressSec by session's durationSec
//
// IMPORTANT: PB 0.23 JSVM API — use $app.findRecordsByFilter, NOT $app.newExpr
// or $app.query() (those are Go-only / not exposed in JSVM 0.23).

/// <reference path="../pb_data/types.d.ts" />

onRecordUpdate((e) => {
  // Only react when endedAt was just set (null → non-null)
  const prevEndedAt = e.record.original().get("endedAt");
  const newEndedAt = e.record.get("endedAt");

  if (!newEndedAt || prevEndedAt) {
    e.next();
    return;
  }

  e.next();

  const durationSec = Number(e.record.get("durationSec") ?? 0);
  if (durationSec <= 0) return;

  const userId = e.record.get("user");
  if (!userId) return;

  try {
    // Find all challenge_participants for this user
    const participants = e.app.findRecordsByFilter(
      "challenge_participants",
      "user = {:userId}",
      "",
      200,
      0,
      { userId: userId }
    );

    for (const participant of participants) {
      const challengeId = participant.get("challenge");
      let challengeType = "";
      let challengeStatus = "";

      try {
        const challenge = e.app.findRecordById("challenges", challengeId);
        challengeType = challenge.get("type");
        challengeStatus = challenge.get("status");
      } catch (_) {
        continue;
      }

      // Only count progress for active challenges
      if (challengeStatus !== "active") continue;

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
      // group_streak: computed on-demand in frontend — no mutation here
    }
  } catch (err) {
    console.error("[on-session-end] Error processing challenge progress:", err);
  }
}, "study_sessions");
