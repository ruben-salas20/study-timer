// pb_hooks/achievements.pb.js
// Detects and persists achievement unlocks. The 25-achievement catalogue
// itself (display name, icon, tier, description) lives in the frontend at
// features/achievements/lib/registry.ts — here we only need the keys + the
// numeric / boolean conditions that decide when something has been earned.
//
// On every event that can move the needle (session end, friendship accept,
// reaction created, activity event created) we recompute the user's state
// and call reconcileAchievements, which is idempotent: inserts only the
// keys not already present in achievements_unlocked.
//
// Idempotency: a UNIQUE (user, key) index on the collection backs us up if
// two hooks race. A failed save during a race is swallowed silently.

/// <reference path="../pb_data/types.d.ts" />

// ── Catalogue (keys + display names for the push body) ─────────────────────
//
// Order matters only for tie-breaking when multiple unlock in a single
// reconcile pass — we send pushes in array order.
const ACHIEVEMENT_NAMES = {
  "primer-paso": "Primer paso",
  "consistente": "Consistente",
  "veterano": "Veterano",
  "hora-cero": "Hora cero",
  "maratonista": "Maratonista",
  "inmersion-total": "Inmersión total",
  "constante": "Constante",
  "en-llamas": "En llamas",
  "imparable": "Imparable",
  "mistico": "Místico",
  "leyenda": "Leyenda",
  "sin-parpadear": "Sin parpadear",
  "maraton": "Maratón",
  "ultra": "Ultra",
  "curioso": "Curioso",
  "polimata": "Polímata",
  "primera-amistad": "Primera amistad",
  "comunidad": "Comunidad",
  "popular": "Popular",
  "campeon": "Campeón",
  "cronista": "Cronista",
  "diarista": "Diarista",
  "cumplidor": "Cumplidor",
  "madrugador": "Madrugador",
  "renacido": "Renacido",
  // Special: granted by an admin, not auto-detected.
  "founder": "Founder",
};

// ── Push helper (inlined; goja scope is file-local) ────────────────────────
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
    console.error("[achievements] dispatchPush error:", err);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function safeGetTimezone(app, userId) {
  try {
    const user = app.findRecordById("users", userId);
    const tz = user.get("timezone");
    return (typeof tz === "string" && tz) ? tz : "UTC";
  } catch (_) {
    return "UTC";
  }
}

/** Local-hour of a UTC ISO date, returns 0-23. */
function localHourOf(isoDate, tz) {
  try {
    const d = new Date(isoDate);
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const hourPart = parts.find((p) => p.type === "hour");
    return hourPart ? parseInt(hourPart.value, 10) : NaN;
  } catch (_) {
    return NaN;
  }
}

/** Local-tz YYYY-MM-DD key of a date. */
function localDayKey(isoDate, tz) {
  try {
    const d = new Date(isoDate);
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(d); // "YYYY-MM-DD"
  } catch (_) {
    return isoDate.slice(0, 10);
  }
}

/** Count consecutive days ending today that have a session in `daySet`. */
function computeStreakDays(daySet, tz) {
  if (daySet.size === 0) return 0;
  const todayKey = localDayKey(new Date().toISOString(), tz);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const cursor = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0));
  let streak = 0;
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!daySet.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** True if any pair of consecutive sessions (by startedAt) has a >= 30-day gap. */
function hasReturnedAfterGap(sessions, gapDays) {
  if (sessions.length < 2) return false;
  // sessions are sorted -startedAt (newest first). Walk pairs.
  const gapMs = gapDays * 24 * 60 * 60 * 1000;
  for (let i = 0; i < sessions.length - 1; i++) {
    const a = new Date(sessions[i].get("startedAt")).getTime();
    const b = new Date(sessions[i + 1].get("startedAt")).getTime();
    if (a - b >= gapMs) return true;
  }
  return false;
}

// ── Evaluation ─────────────────────────────────────────────────────────────

function evaluateAchievements(app, userId) {
  const tz = safeGetTimezone(app, userId);

  // ── Sessions (single batched read, reused for many checks) ─────────────
  let sessions = [];
  try {
    sessions = app.findRecordsByFilter(
      "study_sessions",
      'user = {:u} && endedAt != ""',
      "-startedAt",
      300,
      0,
      { u: userId }
    );
  } catch (err) {
    console.error("[achievements] sessions fetch failed:", err);
  }

  const sessionsCount = sessions.length;
  let totalSec = 0;
  let longestSec = 0;
  const modesSet = new Set();
  const subjectsSet = new Set();
  const daySet = new Set();
  let hadEarlyMorning = false;
  for (const s of sessions) {
    const sec = Number(s.get("durationSec") ?? 0);
    totalSec += sec;
    if (sec > longestSec) longestSec = sec;
    const mode = s.get("mode");
    if (mode) modesSet.add(String(mode));
    const subj = s.get("subject");
    if (subj) subjectsSet.add(String(subj));
    const started = s.get("startedAt");
    if (started) {
      daySet.add(localDayKey(started, tz));
      if (!hadEarlyMorning) {
        const h = localHourOf(started, tz);
        if (!Number.isNaN(h) && h < 7) hadEarlyMorning = true;
      }
    }
  }
  const streak = computeStreakDays(daySet, tz);
  const returnedAfterGap = hasReturnedAfterGap(sessions, 30);

  // ── Friends (accepted) ──────────────────────────────────────────────────
  let friendsCount = 0;
  try {
    const friends = app.findRecordsByFilter(
      "friendships",
      'status = "accepted" && (userA = {:u} || userB = {:u})',
      "",
      50,
      0,
      { u: userId }
    );
    friendsCount = friends.length;
  } catch (err) {
    console.error("[achievements] friends fetch failed:", err);
  }

  // ── My activity events (for reactions received + challenge wins) ────────
  let challengeWinsCount = 0;
  let reactionsReceivedCount = 0;
  try {
    const myEvents = app.findRecordsByFilter(
      "activity_events",
      "actor = {:u}",
      "",
      200,
      0,
      { u: userId }
    );
    for (const ev of myEvents) {
      if (ev.get("type") === "challenge_won") challengeWinsCount++;
    }
    // Cheap "popular" check: any reaction on any of my events. Short-circuit
    // as soon as we find one.
    for (const ev of myEvents) {
      if (reactionsReceivedCount > 0) break;
      try {
        const r = app.findRecordsByFilter(
          "activity_reactions",
          "event = {:e}",
          "",
          1,
          0,
          { e: ev.id }
        );
        if (r.length > 0) reactionsReceivedCount = 1;
      } catch (_) { /* ignore */ }
    }
  } catch (err) {
    console.error("[achievements] activity events fetch failed:", err);
  }

  // ── Notes count ─────────────────────────────────────────────────────────
  let notesCount = 0;
  try {
    const noteSessions = app.findRecordsByFilter(
      "study_sessions",
      'user = {:u} && notes != ""',
      "",
      50,
      0,
      { u: userId }
    );
    notesCount = noteSessions.length;
  } catch (err) {
    console.error("[achievements] notes fetch failed:", err);
  }

  // ── Completed plans ─────────────────────────────────────────────────────
  let completedPlans = 0;
  try {
    const plans = app.findRecordsByFilter(
      "study_plans",
      'user = {:u} && status = "done"',
      "",
      50,
      0,
      { u: userId }
    );
    completedPlans = plans.length;
  } catch (err) {
    console.error("[achievements] plans fetch failed:", err);
  }

  // ── Apply rules ─────────────────────────────────────────────────────────
  return [
    { key: "primer-paso",     unlocked: sessionsCount >= 1 },
    { key: "consistente",     unlocked: sessionsCount >= 10 },
    { key: "veterano",        unlocked: sessionsCount >= 100 },
    { key: "hora-cero",       unlocked: totalSec >= 3600 },
    { key: "maratonista",     unlocked: totalSec >= 50 * 3600 },
    { key: "inmersion-total", unlocked: totalSec >= 250 * 3600 },
    { key: "constante",       unlocked: streak >= 3 },
    { key: "en-llamas",       unlocked: streak >= 7 },
    { key: "imparable",       unlocked: streak >= 14 },
    { key: "mistico",         unlocked: streak >= 30 },
    { key: "leyenda",         unlocked: streak >= 100 },
    { key: "sin-parpadear",   unlocked: longestSec >= 45 * 60 },
    { key: "maraton",         unlocked: longestSec >= 2 * 3600 },
    { key: "ultra",           unlocked: longestSec >= 3 * 3600 },
    { key: "curioso",         unlocked: modesSet.size >= 3 },
    { key: "polimata",        unlocked: subjectsSet.size >= 3 },
    { key: "primera-amistad", unlocked: friendsCount >= 1 },
    { key: "comunidad",       unlocked: friendsCount >= 5 },
    { key: "popular",         unlocked: reactionsReceivedCount >= 1 },
    { key: "campeon",         unlocked: challengeWinsCount >= 1 },
    { key: "cronista",        unlocked: notesCount >= 1 },
    { key: "diarista",        unlocked: notesCount >= 10 },
    { key: "cumplidor",       unlocked: completedPlans >= 1 },
    { key: "madrugador",      unlocked: hadEarlyMorning },
    { key: "renacido",        unlocked: returnedAfterGap },
  ];
}

// ── Reconciler ─────────────────────────────────────────────────────────────

function reconcileAchievements(app, userId) {
  if (!userId) return;

  let evaluations = [];
  try {
    evaluations = evaluateAchievements(app, userId);
  } catch (err) {
    console.error("[achievements] evaluate failed:", err);
    return;
  }

  let existing = [];
  try {
    existing = app.findRecordsByFilter(
      "achievements_unlocked",
      "user = {:u}",
      "",
      100,
      0,
      { u: userId }
    );
  } catch (err) {
    console.error("[achievements] existing fetch failed:", err);
    return;
  }
  const have = new Set(existing.map((r) => r.get("key")));

  const collection = app.findCollectionByNameOrId("achievements_unlocked");
  const nowIso = new Date().toISOString();

  for (const a of evaluations) {
    if (!a.unlocked || have.has(a.key)) continue;
    try {
      const rec = new Record(collection);
      rec.set("user", userId);
      rec.set("key", a.key);
      rec.set("unlockedAt", nowIso);
      app.save(rec);

      const displayName = ACHIEVEMENT_NAMES[a.key] || a.key;
      dispatchPush(userId, {
        title: "¡Logro desbloqueado!",
        body: displayName,
        url: "/achievements",
        tag: `achievement-${a.key}`,
      });
    } catch (saveErr) {
      // Race against UNIQUE (user, key) — fine, another reconcile beat us.
      console.warn(
        `[achievements] insert ${a.key} for ${userId} failed (likely race):`,
        saveErr?.message ?? saveErr
      );
    }
  }
}

// ── Listeners ──────────────────────────────────────────────────────────────

// Sessions that just ended — covers volume / time / streak / longest /
// variety / madrugador / renacido / notes (notes ride on the same record).
onRecordAfterUpdateSuccess((e) => {
  try {
    const prevEnded = e.record.original().getString("endedAt");
    const newEnded = e.record.getString("endedAt");
    if (!newEnded || prevEnded) return;
    const userId = e.record.get("user");
    reconcileAchievements(e.app, userId);
  } catch (err) {
    console.error("[achievements] session-end listener failed:", err);
  }
}, "study_sessions");

// Friendship transitioning to "accepted" — both parties just gained a friend.
onRecordAfterUpdateSuccess((e) => {
  try {
    const prevStatus = e.record.original().getString("status");
    const newStatus = e.record.getString("status");
    if (newStatus !== "accepted" || prevStatus === "accepted") return;
    const a = e.record.get("userA");
    const b = e.record.get("userB");
    if (a) reconcileAchievements(e.app, a);
    if (b) reconcileAchievements(e.app, b);
  } catch (err) {
    console.error("[achievements] friendship-accept listener failed:", err);
  }
}, "friendships");

// Reaction created — the event author may have just earned "popular".
onRecordAfterCreateSuccess((e) => {
  try {
    const eventId = e.record.get("event");
    if (!eventId) return;
    const event = e.app.findRecordById("activity_events", eventId);
    const actorId = event.get("actor");
    if (actorId) reconcileAchievements(e.app, actorId);
  } catch (err) {
    console.error("[achievements] reaction-create listener failed:", err);
  }
}, "activity_reactions");

// Activity event created — the actor may have just earned challenge wins.
onRecordAfterCreateSuccess((e) => {
  try {
    const actorId = e.record.get("actor");
    if (actorId) reconcileAchievements(e.app, actorId);
  } catch (err) {
    console.error("[achievements] activity-event listener failed:", err);
  }
}, "activity_events");

// Plan updated — `cumplidor` flips when status becomes done.
onRecordAfterUpdateSuccess((e) => {
  try {
    const prevStatus = e.record.original().getString("status");
    const newStatus = e.record.getString("status");
    if (newStatus !== "done" || prevStatus === "done") return;
    const userId = e.record.get("user");
    if (userId) reconcileAchievements(e.app, userId);
  } catch (err) {
    console.error("[achievements] plan-done listener failed:", err);
  }
}, "study_plans");
