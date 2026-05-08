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

  const now = new Date().toISOString();

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
      } catch (err) {
        console.error(`[crons] Failed to complete challenge ${challenge.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[crons] Error querying active challenges:", err);
  }
});
