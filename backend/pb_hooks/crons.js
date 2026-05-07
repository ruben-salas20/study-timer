// pb_hooks/crons.js
// Scheduled jobs for the study-timer application.
//
// challenges-status-rollup — runs every 5 minutes:
//   - pending  → active   when startsAt <= now
//   - active   → completed when endsAt < now
//
// PocketBase 0.23 exposes cronAdd(jobName, cronExpr, fn) in the hooks runtime.
// Reference: PocketBase docs §Scheduled jobs, ARCHITECTURE.md §4 F4 scope.

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
      } catch (err) {
        console.error(`[crons] Failed to complete challenge ${challenge.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[crons] Error querying active challenges:", err);
  }
});
