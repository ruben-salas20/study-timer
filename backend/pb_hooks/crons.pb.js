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
// inside [now+9min, now+10min] and have not been notified yet. Fire a push,
// flip notified=true. The 1-minute window keeps the perceived delivery
// close to the promised "10 minutes before" — wider windows (e.g. 9-11min)
// could surface 11-min-early notifications that feel off.
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
  const windowEnd = new Date(nowMs + 10 * 60 * 1000).toISOString().replace("T", " ");

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

// achievement-safety-net — hourly reconcile of all users with activity in
// the last 14 days. The event-driven listeners in achievements.pb.js do
// the work in real time, but if one ever fails silently (goja scope
// gotchas, datetime-field surprises, transient DB errors) this catches
// the gap so users don't have to "do another session" to unlock what
// they already earned.
cronAdd("achievement-safety-net", "0 * * * *", () => {
  // Inline reconciler — same body as the per-event listeners in
  // achievements.pb.js. Kept in sync manually because goja JSVM isolates
  // every callback scope.
  const NAMES = {"primer-paso":"Primer paso","consistente":"Consistente","veterano":"Veterano","hora-cero":"Hora cero","maratonista":"Maratonista","inmersion-total":"Inmersión total","constante":"Constante","en-llamas":"En llamas","imparable":"Imparable","mistico":"Místico","leyenda":"Leyenda","sin-parpadear":"Sin parpadear","maraton":"Maratón","ultra":"Ultra","curioso":"Curioso","polimata":"Polímata","primera-amistad":"Primera amistad","comunidad":"Comunidad","popular":"Popular","campeon":"Campeón","cronista":"Cronista","diarista":"Diarista","cumplidor":"Cumplidor","madrugador":"Madrugador","renacido":"Renacido","founder":"Founder"};
  function localHourOf(iso,tz){try{const d=new Date(iso);const parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hour12:false}).formatToParts(d);const h=parts.find((p)=>p.type==="hour");return h?parseInt(h.value,10):NaN;}catch(_){return NaN;}}
  function localDayKey(iso,tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));}catch(_){return iso.slice(0,10);}}
  function pushNotif(uid,payload){try{const url=$os.getenv("PUSH_SERVICE_URL")||"http://push-service:3001";const tok=$os.getenv("PUSH_SERVICE_TOKEN")||"";if(!tok)return;$http.send({url:`${url}/dispatch`,method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok}`},body:JSON.stringify({userId:uid,payload}),timeout:5});}catch(_){}}
  function reconcile(app,uid){let tz="UTC";try{const u=app.findRecordById("users",uid);const t=u.get("timezone");if(typeof t==="string"&&t)tz=t;}catch(_){}let sessions=[];try{sessions=app.findRecordsByFilter("study_sessions",'user = {:u} && endedAt != ""',"-startedAt",300,0,{u:uid});}catch(_){}const sessionsCount=sessions.length;let totalSec=0,longestSec=0;const modesSet=new Set(),subjectsSet=new Set(),daySet=new Set();let early=false;for(const s of sessions){const sec=Number(s.get("durationSec")??0);totalSec+=sec;if(sec>longestSec)longestSec=sec;const m=s.get("mode");if(m)modesSet.add(String(m));const sj=s.get("subject");if(sj)subjectsSet.add(String(sj));const st=s.getString("startedAt");if(st){daySet.add(localDayKey(st,tz));if(!early){const h=localHourOf(st,tz);if(!Number.isNaN(h)&&h<7)early=true;}}}let streak=0;if(daySet.size>0){const today=localDayKey(new Date().toISOString(),tz);const[ty,tm,td]=today.split("-").map(Number);const cur=new Date(Date.UTC(ty,tm-1,td,12,0,0));while(true){const k=cur.toISOString().slice(0,10);if(!daySet.has(k))break;streak++;cur.setUTCDate(cur.getUTCDate()-1);}}let returned=false;const gapMs=30*24*60*60*1000;for(let i=0;i<sessions.length-1;i++){const a2=new Date(sessions[i].getString("startedAt")).getTime();const b2=new Date(sessions[i+1].getString("startedAt")).getTime();if(a2-b2>=gapMs){returned=true;break;}}let friendsCount=0;try{friendsCount=app.findRecordsByFilter("friendships",'status = "accepted" && (userA = {:u} || userB = {:u})',"",50,0,{u:uid}).length;}catch(_){}let wins=0,popular=0;try{const myEvents=app.findRecordsByFilter("activity_events","actor = {:u}","",200,0,{u:uid});for(const ev2 of myEvents)if(ev2.get("type")==="challenge_won")wins++;for(const ev2 of myEvents){if(popular>0)break;try{const r=app.findRecordsByFilter("activity_reactions","event = {:e}","",1,0,{e:ev2.id});if(r.length>0)popular=1;}catch(_){}}}catch(_){}let notesCount=0;try{notesCount=app.findRecordsByFilter("study_sessions",'user = {:u} && notes != ""',"",50,0,{u:uid}).length;}catch(_){}let plansDone=0;try{plansDone=app.findRecordsByFilter("study_plans",'user = {:u} && status = "done"',"",50,0,{u:uid}).length;}catch(_){}const evaluations=[{key:"primer-paso",unlocked:sessionsCount>=1},{key:"consistente",unlocked:sessionsCount>=10},{key:"veterano",unlocked:sessionsCount>=100},{key:"hora-cero",unlocked:totalSec>=3600},{key:"maratonista",unlocked:totalSec>=50*3600},{key:"inmersion-total",unlocked:totalSec>=250*3600},{key:"constante",unlocked:streak>=3},{key:"en-llamas",unlocked:streak>=7},{key:"imparable",unlocked:streak>=14},{key:"mistico",unlocked:streak>=30},{key:"leyenda",unlocked:streak>=100},{key:"sin-parpadear",unlocked:longestSec>=45*60},{key:"maraton",unlocked:longestSec>=2*3600},{key:"ultra",unlocked:longestSec>=3*3600},{key:"curioso",unlocked:modesSet.size>=3},{key:"polimata",unlocked:subjectsSet.size>=3},{key:"primera-amistad",unlocked:friendsCount>=1},{key:"comunidad",unlocked:friendsCount>=5},{key:"popular",unlocked:popular>=1},{key:"campeon",unlocked:wins>=1},{key:"cronista",unlocked:notesCount>=1},{key:"diarista",unlocked:notesCount>=10},{key:"cumplidor",unlocked:plansDone>=1},{key:"madrugador",unlocked:early},{key:"renacido",unlocked:returned}];let existing=[];try{existing=app.findRecordsByFilter("achievements_unlocked","user = {:u}","",100,0,{u:uid});}catch(_){return 0;}const have=new Set(existing.map((r)=>r.get("key")));const collection=app.findCollectionByNameOrId("achievements_unlocked");const nowIso=new Date().toISOString();let granted=0;for(const a3 of evaluations){if(!a3.unlocked||have.has(a3.key))continue;try{const rec=new Record(collection);rec.set("user",uid);rec.set("key",a3.key);rec.set("unlockedAt",nowIso);app.save(rec);pushNotif(uid,{title:"¡Logro desbloqueado!",body:NAMES[a3.key]||a3.key,url:"/achievements",tag:`achievement-${a3.key}`});granted++;}catch(_){}}return granted}

  // ── Job body — iterate active users from the last 14 days ────────────
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString().replace("T", " ");
  let activeUserIds = new Set();
  try {
    const recent = $app.findRecordsByFilter(
      "study_sessions",
      `startedAt >= "${cutoff}" && endedAt != ""`,
      "-startedAt",
      500,
      0
    );
    for (const s of recent) {
      const uid = s.get("user");
      if (uid) activeUserIds.add(uid);
    }
  } catch (err) {
    console.error("[crons:achievement-safety-net] active users query failed:", err);
    return;
  }

  let totalGranted = 0;
  for (const uid of activeUserIds) {
    try {
      totalGranted += reconcile($app, uid);
    } catch (err) {
      console.error(`[crons:achievement-safety-net] reconcile failed for ${uid}:`, err);
    }
  }
  if (totalGranted > 0) {
    console.log(`[crons:achievement-safety-net] swept ${activeUserIds.size} users, granted ${totalGranted} unlocks`);
  }
});
