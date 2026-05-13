// pb_hooks/crons.pb.js
// Scheduled jobs for the study-timer application.
//
// challenges-status-rollup — runs every minute:
//   - pending  → active    when startsAt <= now
//   - active   → completed when endsAt < now
//
// IMPORTANT: goja JSVM isolates each callback's scope. All helpers must be
// defined INSIDE the callback that uses them.
//
// PB 0.23 API note:
//   $app.findRecordsByFilter(collection, filter, sort, limit, offset, params)
//   is the documented way to query. There is no $app.newExpr() in JSVM.

/// <reference path="../pb_data/types.d.ts" />

cronAdd("challenges-status-rollup", "*/1 * * * *", () => {
  // ── Inline helpers (goja JSVM scope isolation) ──────────────────────────

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
      console.error("[crons] dispatchPush error:", err);
    }
  }

  function notifyParticipants(challengeId, payload) {
    try {
      const participants = $app.findRecordsByFilter(
        "challenge_participants",
        "challenge = {:id}",
        "",
        100,
        0,
        { id: challengeId }
      );
      for (const p of participants) {
        const userId = p.get("user");
        if (userId) dispatchPush(userId, payload);
      }
    } catch (err) {
      console.error(`[crons] notifyParticipants failed for ${challengeId}:`, err);
    }
  }

  // ── Job logic ──────────────────────────────────────────────────────────

  // PocketBase stores datetime values in SQLite as TEXT using a SPACE
  // separator ("2026-05-08 22:21:00.000Z"). When a filter parameter is
  // supplied as a regular ISO string ("2026-05-08T21:25:00.000Z" — with a
  // 'T'), SQLite string-compares them char-by-char and " " (0x20) is always
  // less than "T" (0x54). That made every "endsAt < now" comparison return
  // true regardless of the real instant, so the cron completed every active
  // challenge on its very next tick.
  // Fix: format `now` with a space separator so both sides of the
  // comparison use the same representation and the lexical order matches
  // chronological order.
  const now = new Date().toISOString().replace("T", " ");

  // pending → active (startsAt has passed)
  try {
    const toActivate = $app.findRecordsByFilter(
      "challenges",
      'status = "pending" && startsAt <= {:now}',
      "",
      200,
      0,
      { now: now }
    );

    for (const challenge of toActivate) {
      challenge.set("status", "active");
      try {
        $app.save(challenge);
        notifyParticipants(challenge.id, {
          title: "¡Tu reto comenzó!",
          body: `El reto "${challenge.get("title") || "sin título"}" ya está activo`,
          url: `/challenges/${challenge.id}`,
          tag: `challenge-active-${challenge.id}`,
        });
      } catch (err) {
        console.error(`[crons] Failed to activate challenge ${challenge.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[crons] Error querying pending challenges:", err);
  }

  // active → completed (endsAt has passed)
  try {
    const toComplete = $app.findRecordsByFilter(
      "challenges",
      'status = "active" && endsAt < {:now}',
      "",
      200,
      0,
      { now: now }
    );

    for (const challenge of toComplete) {
      challenge.set("status", "completed");
      try {
        $app.save(challenge);
        notifyParticipants(challenge.id, {
          title: "Reto finalizado",
          body: `El reto "${challenge.get("title") || "sin título"}" ha concluido`,
          url: `/challenges/${challenge.id}`,
          tag: `challenge-completed-${challenge.id}`,
        });

        // ── Activity feed: emit challenge_won for the winner ──────────────
        // Race / duel / weekly_goal: winner = participant with the highest
        // progressSec. group_streak: emit per participant whose streakDays
        // reached the target so every contributor shows up. Tie-breaking by
        // first record is fine — feed is informational, not authoritative.
        try {
          const eventsCol = $app.findCollectionByNameOrId("activity_events");
          const challengeType = challenge.get("type");
          const challengeTitle = challenge.get("title") || "sin título";
          const allParts = $app.findRecordsByFilter(
            "challenge_participants",
            "challenge = {:c}",
            "",
            50,
            0,
            { c: challenge.id }
          );

          if (challengeType === "group_streak") {
            const target = Number(challenge.get("targetDays") ?? 0);
            for (const p of allParts) {
              const days = Number(p.get("streakDays") ?? 0);
              if (target > 0 && days >= target) {
                const ev = new Record(eventsCol);
                ev.set("actor", p.get("user"));
                ev.set("type", "challenge_won");
                ev.set("payload", {
                  challengeId: challenge.id,
                  challengeTitle: challengeTitle,
                  challengeType: challengeType,
                  streakDays: days,
                });
                $app.save(ev);
              }
            }
          } else {
            // race / duel / weekly_goal: pick highest progressSec
            let winner = null;
            let bestSec = -1;
            for (const p of allParts) {
              const sec = Number(p.get("progressSec") ?? 0);
              if (sec > bestSec) {
                bestSec = sec;
                winner = p;
              }
            }
            if (winner && bestSec > 0) {
              const ev = new Record(eventsCol);
              ev.set("actor", winner.get("user"));
              ev.set("type", "challenge_won");
              ev.set("payload", {
                challengeId: challenge.id,
                challengeTitle: challengeTitle,
                challengeType: challengeType,
                progressSec: bestSec,
              });
              $app.save(ev);
            }
          }
        } catch (evErr) {
          console.error(`[crons] activity event emit failed for challenge ${challenge.id}:`, evErr);
        }
      } catch (err) {
        console.error(`[crons] Failed to complete challenge ${challenge.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[crons] Error querying active challenges:", err);
  }
});

// study-plan-reminders — every minute, scan study_plans whose plannedAt is
// inside [now+9min, now+11min] and have not been notified yet. Fire a push,
// flip notified=true. The 2-minute window covers the ~1-minute cron jitter
// while staying within the user's mental "10 minutes before" expectation.
cronAdd("study-plan-reminders", "*/1 * * * *", () => {
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
      console.error("[crons:plan-reminders] dispatchPush error:", err);
    }
  }

  function formatTime(isoDate) {
    try {
      const d = new Date(isoDate);
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch (_) {
      return "";
    }
  }

  // Window math — both sides formatted with the space separator PB uses
  // internally (same fix as the challenge rollup above).
  const nowMs = Date.now();
  const windowStart = new Date(nowMs + 9 * 60 * 1000).toISOString().replace("T", " ");
  const windowEnd = new Date(nowMs + 11 * 60 * 1000).toISOString().replace("T", " ");

  try {
    const dueSoon = $app.findRecordsByFilter(
      "study_plans",
      'status = "upcoming" && notified != true && plannedAt >= {:start} && plannedAt <= {:end}',
      "",
      200,
      0,
      { start: windowStart, end: windowEnd }
    );

    for (const plan of dueSoon) {
      const userId = plan.get("user");
      if (!userId) continue;

      // Resolve subject name for a nicer push body. Falls back gracefully
      // when the plan has no subject set or the subject was deleted.
      let subjectName = "";
      const subjectId = plan.get("subject");
      if (subjectId) {
        try {
          const subj = $app.findRecordById("subjects", subjectId);
          subjectName = subj.get("name") || "";
        } catch (_) { /* subject gone, ignore */ }
      }

      const durationMin = Number(plan.get("durationMin") ?? 0);
      const startTime = formatTime(plan.get("plannedAt"));
      const subjectPart = subjectName ? `${subjectName} · ` : "";

      dispatchPush(userId, {
        title: "Próxima sesión en 10 min",
        body: `${subjectPart}${startTime} · ${durationMin} min`,
        url: "/plan",
        tag: `plan-${plan.id}`,
      });

      try {
        plan.set("notified", true);
        $app.save(plan);
      } catch (err) {
        console.error(`[crons:plan-reminders] failed to mark plan ${plan.id} notified:`, err);
      }
    }
  } catch (err) {
    console.error("[crons:plan-reminders] query error:", err);
  }
});
