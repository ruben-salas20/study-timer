// pb_hooks/crons.pb.js
// Scheduled jobs for the study-timer application.
//
// challenges-status-rollup — runs every 5 minutes:
//   - pending  → active    when startsAt <= now
//   - active   → completed when endsAt < now
//
// [F6] Push notifications are dispatched on status transitions.
//
// IMPORTANT: goja JSVM isolates each callback's scope. All helpers must be
// defined INSIDE the callback that uses them.

/// <reference path="../pb_data/types.d.ts" />

cronAdd("challenges-status-rollup", "*/5 * * * *", () => {
  // ── Inline helpers (goja JSVM scope isolation) ──────────────────────────

  function dispatchPush(app, userId, payload) {
    try {
      const pushServiceUrl = $os.getenv("PUSH_SERVICE_URL") || "http://push-service:3001";
      const pushServiceToken = $os.getenv("PUSH_SERVICE_TOKEN") || "";

      if (!pushServiceToken) return; // silently skip if not configured

      const response = $http.send({
        url: `${pushServiceUrl}/dispatch`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pushServiceToken}`,
        },
        body: JSON.stringify({ userId, payload }),
        timeout: 5,
      });

      if (response.statusCode >= 400) {
        console.error(`[crons] push-service ${response.statusCode} for user ${userId}`);
      }
    } catch (err) {
      console.error("[crons] dispatchPush error:", err);
    }
  }

  function notifyParticipants(app, challengeId, payload) {
    try {
      const participants = app.findAllRecords("challenge_participants",
        app.newExpr('challenge = {:id}', { id: challengeId })
      );
      for (const p of participants) {
        const userId = p.get("user");
        if (userId) dispatchPush(app, userId, payload);
      }
    } catch (err) {
      console.error(`[crons] notifyParticipants failed for ${challengeId}:`, err);
    }
  }

  // ── Job logic ──────────────────────────────────────────────────────────

  const now = new Date().toISOString();

  // pending → active
  try {
    const toActivate = $app.findAllRecords("challenges",
      $app.newExpr('status = "pending" && startsAt <= {:now}', { now })
    );

    for (const challenge of toActivate) {
      challenge.set("status", "active");
      try {
        $app.save(challenge);
        notifyParticipants($app, challenge.id, {
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

  // active → completed
  try {
    const toComplete = $app.findAllRecords("challenges",
      $app.newExpr('status = "active" && endsAt < {:now}', { now })
    );

    for (const challenge of toComplete) {
      challenge.set("status", "completed");
      try {
        $app.save(challenge);
        notifyParticipants($app, challenge.id, {
          title: "Reto finalizado",
          body: `El reto "${challenge.get("title") || "sin título"}" (${challenge.get("type")}) ha concluido`,
          url: `/challenges/${challenge.id}`,
          tag: `challenge-completed-${challenge.id}`,
        });
      } catch (err) {
        console.error(`[crons] Failed to complete challenge ${challenge.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[crons] Error querying active challenges:", err);
  }
});
