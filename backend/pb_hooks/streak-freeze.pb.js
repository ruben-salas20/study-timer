// pb_hooks/streak-freeze.pb.js
// Maintains the user's streak-freeze state on every session end.
//
// Rules in one paragraph:
//   Each user gets 2 freezes per calendar month. A freeze bridges a missed
//   day, but ONLY if a real session exists within `budget` days behind the
//   gap (no freezing into the void). Applied dates accumulate forever; only
//   the BUDGET resets on month rollover (detected lazily by comparing
//   freezeMonth to the current YYYY-MM here).
//
// goja JSVM: every helper is inlined in the callback per the project's
// scope-isolation pattern (see achievements.pb.js).

/// <reference path="../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess((e) => {
  try {
    const prevEnded = e.record.original().getString("endedAt");
    const newEnded = e.record.getString("endedAt");
    if (!newEnded || prevEnded) return;
    const userId = e.record.get("user");
    if (!userId) return;

    function localDayKey(iso, tz) {
      try {
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date(iso));
      } catch (_) {
        return String(iso).slice(0, 10);
      }
    }

    function utcDay(year, month0, day) {
      return new Date(Date.UTC(year, month0, day, 12, 0, 0));
    }

    // ── Read user state ─────────────────────────────────────────────
    let user;
    try { user = e.app.findRecordById("users", userId); }
    catch (_) { return; }

    const tz = user.get("timezone") || "UTC";
    const currentMonth = new Date().toISOString().slice(0, 7);
    let budget = Number(user.get("freezeBudget") ?? 2);
    if (!Number.isFinite(budget)) budget = 2;
    const storedMonth = user.getString("freezeMonth") || "";
    let appliedDates = [];
    try {
      const raw = user.get("freezeAppliedDates");
      if (Array.isArray(raw)) appliedDates = raw.slice();
    } catch (_) { /* keep empty */ }

    // Month rollover — budget refills, applied dates persist.
    if (storedMonth !== currentMonth) {
      budget = 2;
    }

    // ── Build the user's day-set from completed sessions ──────────────
    let sessions = [];
    try {
      sessions = e.app.findRecordsByFilter(
        "study_sessions",
        'user = {:u} && endedAt != ""',
        "-startedAt", 300, 0, { u: userId }
      );
    } catch (_) { return; }

    const daySet = new Set();
    for (const s of sessions) {
      const st = s.getString("startedAt");
      if (st) daySet.add(localDayKey(st, tz));
    }

    const appliedSet = new Set(appliedDates);

    // ── Walk back from today, applying freezes as needed ─────────────
    const todayKey = localDayKey(new Date().toISOString(), tz);
    const [ty, tm, td] = todayKey.split("-").map(Number);
    const cursor = utcDay(ty, tm - 1, td);

    // Cap the walk so a pathological user doesn't loop forever.
    const MAX_WALK = 366;
    let walked = 0;

    while (walked < MAX_WALK) {
      const key = cursor.toISOString().slice(0, 10);
      walked++;

      if (daySet.has(key) || appliedSet.has(key)) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }

      if (budget <= 0) break;

      // Only apply a freeze if a real session exists within `budget`
      // days behind the current gap — freezes bridge gaps, they don't
      // create streaks from nothing.
      let canBridge = false;
      const lookahead = new Date(cursor);
      for (let k = 1; k <= budget; k++) {
        lookahead.setUTCDate(lookahead.getUTCDate() - 1);
        if (daySet.has(lookahead.toISOString().slice(0, 10))) {
          canBridge = true;
          break;
        }
      }
      if (!canBridge) break;

      appliedSet.add(key);
      appliedDates.push(key);
      budget--;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    // ── Persist updated state ────────────────────────────────────────
    user.set("freezeBudget", budget);
    user.set("freezeMonth", currentMonth);
    user.set("freezeAppliedDates", appliedDates);
    try { e.app.save(user); }
    catch (saveErr) {
      console.error("[streak-freeze] save user failed:", saveErr);
    }
  } catch (err) {
    console.error("[streak-freeze] listener failed:", err);
  }
}, "study_sessions");
