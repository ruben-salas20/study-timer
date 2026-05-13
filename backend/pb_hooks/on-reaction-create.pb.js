// pb_hooks/on-reaction-create.pb.js
// Fires after an activity_reactions record is created.
//
// Responsibility:
//   - Notify the event author that someone reacted, unless the reactor is
//     the author themselves (no self-pings).
//
// PB 0.23 JSVM goja: each hook callback has isolated scope, so helpers are
// inlined here instead of imported.

/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  e.next();

  try {
    const reactorId = e.record.get("user");
    const eventId = e.record.get("event");
    const emoji = e.record.get("emoji");
    if (!reactorId || !eventId) return;

    // Resolve the underlying event to know who the actor is.
    let event;
    try {
      event = e.app.findRecordById("activity_events", eventId);
    } catch (_) {
      return; // event vanished (cascade); nothing to notify.
    }

    const actorId = event.get("actor");
    if (!actorId || actorId === reactorId) return; // skip self-reactions.

    // Look up reactor display name for the push body.
    let reactorName = "Alguien";
    try {
      const reactorRec = e.app.findRecordById("users", reactorId);
      const dn = reactorRec.get("displayName");
      if (dn) reactorName = String(dn);
    } catch (_) {
      // fallback to "Alguien"
    }

    const pushServiceUrl = $os.getenv("PUSH_SERVICE_URL") || "http://push-service:3001";
    const pushServiceToken = $os.getenv("PUSH_SERVICE_TOKEN") || "";
    if (!pushServiceToken) return;

    try {
      $http.send({
        url: `${pushServiceUrl}/dispatch`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pushServiceToken}`,
        },
        body: JSON.stringify({
          userId: actorId,
          payload: {
            title: `${reactorName} reaccionó ${emoji}`,
            body: "Tocá para ver tu actividad",
            url: "/feed",
            tag: `reaction-${eventId}`,
          },
        }),
        timeout: 5,
      });
    } catch (httpErr) {
      console.error("[on-reaction-create] push dispatch failed:", httpErr);
    }
  } catch (err) {
    console.error("[on-reaction-create] error:", err);
  }
}, "activity_reactions");
