// pb_hooks/crons.js
// Scheduled jobs for the study-timer application.
//
// challenges-status-rollup — runs every 5 minutes:
//   - pending  → active    when startsAt <= now
//   - active   → completed when endsAt < now
//
// [F6] Push notifications are dispatched on status transitions:
//   - pending → active:    notify all participants "Reto comenzado"
//   - active  → completed: notify all participants "Reto finalizado"
//
// PocketBase 0.23 exposes cronAdd(jobName, cronExpr, fn) in the hooks runtime.
// Reference: PocketBase docs §Scheduled jobs, ARCHITECTURE.md §4 F4/F6 scope.

/// <reference path="../pb_data/types.d.ts" />

cronAdd("challenges-status-rollup", "*/5 * * * *", () => {
  const now = new Date().toISOString();

  // Activate pending challenges whose start time has passed
  try {
    const toActivate = $app.findAllRecords("challenges",
      $app.query()
        .andWhere($app.newExpr('status = "pending"'))
        .andWhere($app.newExpr('startsAt <= {:now}', { now }))
    );

    for (const challenge of toActivate) {
      challenge.set("status", "active");
      try {
        $app.save(challenge);

        // [F6] Notify all participants that the challenge has started
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

  // Complete active challenges whose end time has passed
  try {
    const toComplete = $app.findAllRecords("challenges",
      $app.query()
        .andWhere($app.newExpr('status = "active"'))
        .andWhere($app.newExpr('endsAt < {:now}', { now }))
    );

    for (const challenge of toComplete) {
      challenge.set("status", "completed");
      try {
        $app.save(challenge);

        // [F6] Notify all participants that the challenge has ended
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

// ── Push helpers (inline — goja does not support require() for local modules) ─

/**
 * notifyParticipants — dispatch a push notification to every participant
 * of a challenge. Best-effort: individual failures are logged, not thrown.
 */
function notifyParticipants(app, challengeId, payload) {
  try {
    const participants = app.findAllRecords("challenge_participants",
      app.query().andWhere(app.newExpr('challenge = {:id}', { id: challengeId }))
    );

    for (const p of participants) {
      const userId = p.get("user");
      if (userId) {
        dispatchPush(app, userId, payload);
      }
    }
  } catch (err) {
    console.error(`[crons] Failed to notify participants for challenge ${challengeId}:`, err);
  }
}

/**
 * dispatchPush — fire a push notification for a user via the push-service.
 * Best-effort: errors are logged but never re-thrown.
 */
function dispatchPush(app, userId, payload) {
  try {
    const pushServiceUrl = $os.getenv("PUSH_SERVICE_URL") || "http://push-service:3001";
    const pushServiceToken = $os.getenv("PUSH_SERVICE_TOKEN") || "";

    if (!pushServiceToken) {
      console.warn("[notifications] PUSH_SERVICE_TOKEN not set — skipping push");
      return;
    }

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
      console.error(
        `[notifications] push-service returned ${response.statusCode} for user ${userId}:`,
        response.raw
      );
    }
  } catch (err) {
    console.error("[notifications] Failed to dispatch push notification:", err);
  }
}
