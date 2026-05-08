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

      // Timed types: increment own progress
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

      // Group streak: recompute streakDays for all participants of this challenge
      if (challengeType === "group_streak") {
        try {
          const challenge = e.app.findRecordById("challenges", challengeId);
          const allParts = e.app.findRecordsByFilter(
            "challenge_participants",
            "challenge = {:c}",
            "",
            50,
            0,
            { c: challengeId }
          );

          const partUserIds = allParts.map((p) => p.get("user"));
          if (partUserIds.length === 0) continue;

          // Determine day window (UTC days from startsAt to min(today, endsAt))
          const startsAt = new Date(challenge.get("startsAt"));
          const endsAt = new Date(challenge.get("endsAt"));
          const today = new Date();
          const lastDay = endsAt < today ? endsAt : today;

          // Walk day by day; streak = longest contiguous prefix where ALL logged
          const ONE_DAY = 24 * 60 * 60 * 1000;
          const dayStart = new Date(Date.UTC(
            startsAt.getUTCFullYear(), startsAt.getUTCMonth(), startsAt.getUTCDate()
          ));
          const lastDayStart = new Date(Date.UTC(
            lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()
          ));

          let validDays = 0;
          let cursor = dayStart.getTime();
          const endTime = lastDayStart.getTime();

          while (cursor <= endTime) {
            const dayStartIso = new Date(cursor).toISOString();
            const dayEndIso = new Date(cursor + ONE_DAY).toISOString();

            let allLogged = true;
            for (const uid of partUserIds) {
              try {
                const sessions = e.app.findRecordsByFilter(
                  "study_sessions",
                  'user = {:u} && startedAt >= {:d0} && startedAt < {:d1} && endedAt != ""',
                  "",
                  1,
                  0,
                  { u: uid, d0: dayStartIso, d1: dayEndIso }
                );
                if (sessions.length === 0) {
                  allLogged = false;
                  break;
                }
              } catch (_) {
                allLogged = false;
                break;
              }
            }

            if (allLogged) {
              validDays++;
              cursor += ONE_DAY;
            } else {
              break; // streak interrupted
            }
          }

          // Update streakDays on every participant of this challenge
          for (const p of allParts) {
            p.set("streakDays", validDays);
            try {
              e.app.save(p);
            } catch (_) { /* skip individual failures */ }
          }
        } catch (gsErr) {
          console.error(`[on-session-end] group_streak recompute failed for ${challengeId}:`, gsErr);
        }
      }
    }
  } catch (err) {
    console.error("[on-session-end] Error processing challenge progress:", err);
  }
}, "study_sessions");
