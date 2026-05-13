// pb_hooks/achievements.pb.js
// Detects and persists achievement unlocks across the 25 earnable
// achievements. The catalogue (names, icons, descriptions) lives in the
// frontend at features/achievements/lib/registry.ts — here we only need
// keys + numeric / boolean predicates.
//
// IMPORTANT — goja JSVM scope: in PocketBase 0.23 each hook callback runs
// in an ISOLATED scope. Top-level functions in this file are NOT visible
// inside callback bodies (silent ReferenceError at call time). Every
// callback below therefore defines the full reconciler INSIDE itself.
// Yes it's duplicated; that's the only pattern that survives goja's
// per-callback context. Keep the helper bodies in sync if you edit one.

/// <reference path="../pb_data/types.d.ts" />

// ── study_sessions: a session was just ended ───────────────────────────────
onRecordAfterUpdateSuccess((e) => {
  try {
    const prevEnded = e.record.original().getString("endedAt");
    const newEnded = e.record.getString("endedAt");
    if (!newEnded || prevEnded) return;
    const userId = e.record.get("user");
    if (!userId) return;

    // ── Inline reconciler (must be self-contained per goja scope) ───
    const NAMES = {
      "primer-paso":"Primer paso","consistente":"Consistente","veterano":"Veterano",
      "hora-cero":"Hora cero","maratonista":"Maratonista","inmersion-total":"Inmersión total",
      "constante":"Constante","en-llamas":"En llamas","imparable":"Imparable",
      "mistico":"Místico","leyenda":"Leyenda","sin-parpadear":"Sin parpadear",
      "maraton":"Maratón","ultra":"Ultra","curioso":"Curioso","polimata":"Polímata",
      "primera-amistad":"Primera amistad","comunidad":"Comunidad","popular":"Popular",
      "campeon":"Campeón","cronista":"Cronista","diarista":"Diarista",
      "cumplidor":"Cumplidor","madrugador":"Madrugador","renacido":"Renacido",
      "founder":"Founder",
    };
    function localHourOf(iso, tz) {
      try {
        const d = new Date(iso);
        const parts = new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hour12:false}).formatToParts(d);
        const h = parts.find((p)=>p.type==="hour");
        return h ? parseInt(h.value,10) : NaN;
      } catch(_) { return NaN; }
    }
    function localDayKey(iso, tz) {
      try {
        return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
      } catch(_) { return iso.slice(0,10); }
    }
    function pushNotif(uid, payload) {
      try {
        const url = $os.getenv("PUSH_SERVICE_URL") || "http://push-service:3001";
        const tok = $os.getenv("PUSH_SERVICE_TOKEN") || "";
        if (!tok) return;
        $http.send({url:`${url}/dispatch`,method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok}`},body:JSON.stringify({userId:uid,payload}),timeout:5});
      } catch(_) {}
    }
    function reconcile(app, uid) {
      let tz = "UTC";
      try { const u = app.findRecordById("users", uid); const t = u.get("timezone"); if (typeof t === "string" && t) tz = t; } catch(_) {}

      let sessions = [];
      try { sessions = app.findRecordsByFilter("study_sessions",'user = {:u} && endedAt != ""',"-startedAt",300,0,{u:uid}); } catch(_) {}

      const sessionsCount = sessions.length;
      let totalSec = 0, longestSec = 0;
      const modesSet = new Set(), subjectsSet = new Set(), daySet = new Set();
      let early = false;
      for (const s of sessions) {
        const sec = Number(s.get("durationSec") ?? 0);
        totalSec += sec;
        if (sec > longestSec) longestSec = sec;
        const m = s.get("mode"); if (m) modesSet.add(String(m));
        const sj = s.get("subject"); if (sj) subjectsSet.add(String(sj));
        const st = s.getString("startedAt");
        if (st) {
          daySet.add(localDayKey(st, tz));
          if (!early) { const h = localHourOf(st, tz); if (!Number.isNaN(h) && h < 7) early = true; }
        }
      }

      // streak
      let streak = 0;
      if (daySet.size > 0) {
        const today = localDayKey(new Date().toISOString(), tz);
        const [ty,tm,td] = today.split("-").map(Number);
        const cur = new Date(Date.UTC(ty, tm-1, td, 12, 0, 0));
        while (true) {
          const k = cur.toISOString().slice(0,10);
          if (!daySet.has(k)) break;
          streak++;
          cur.setUTCDate(cur.getUTCDate() - 1);
        }
      }

      // returned-after-gap (sorted newest-first)
      let returned = false;
      const gapMs = 30 * 24 * 60 * 60 * 1000;
      for (let i = 0; i < sessions.length - 1; i++) {
        const a = new Date(sessions[i].getString("startedAt")).getTime();
        const b = new Date(sessions[i+1].getString("startedAt")).getTime();
        if (a - b >= gapMs) { returned = true; break; }
      }

      // friends accepted
      let friendsCount = 0;
      try { friendsCount = app.findRecordsByFilter("friendships",'status = "accepted" && (userA = {:u} || userB = {:u})',"",50,0,{u:uid}).length; } catch(_) {}

      // my events → wins + popular short-circuit
      let wins = 0, popular = 0;
      try {
        const myEvents = app.findRecordsByFilter("activity_events","actor = {:u}","",200,0,{u:uid});
        for (const ev of myEvents) if (ev.get("type") === "challenge_won") wins++;
        for (const ev of myEvents) {
          if (popular > 0) break;
          try {
            const r = app.findRecordsByFilter("activity_reactions","event = {:e}","",1,0,{e:ev.id});
            if (r.length > 0) popular = 1;
          } catch(_) {}
        }
      } catch(_) {}

      // notes
      let notesCount = 0;
      try { notesCount = app.findRecordsByFilter("study_sessions",'user = {:u} && notes != ""',"",50,0,{u:uid}).length; } catch(_) {}

      // completed plans
      let plansDone = 0;
      try { plansDone = app.findRecordsByFilter("study_plans",'user = {:u} && status = "done"',"",50,0,{u:uid}).length; } catch(_) {}

      const evaluations = [
        { key:"primer-paso",     unlocked: sessionsCount >= 1 },
        { key:"consistente",     unlocked: sessionsCount >= 10 },
        { key:"veterano",        unlocked: sessionsCount >= 100 },
        { key:"hora-cero",       unlocked: totalSec >= 3600 },
        { key:"maratonista",     unlocked: totalSec >= 50*3600 },
        { key:"inmersion-total", unlocked: totalSec >= 250*3600 },
        { key:"constante",       unlocked: streak >= 3 },
        { key:"en-llamas",       unlocked: streak >= 7 },
        { key:"imparable",       unlocked: streak >= 14 },
        { key:"mistico",         unlocked: streak >= 30 },
        { key:"leyenda",         unlocked: streak >= 100 },
        { key:"sin-parpadear",   unlocked: longestSec >= 45*60 },
        { key:"maraton",         unlocked: longestSec >= 2*3600 },
        { key:"ultra",           unlocked: longestSec >= 3*3600 },
        { key:"curioso",         unlocked: modesSet.size >= 3 },
        { key:"polimata",        unlocked: subjectsSet.size >= 3 },
        { key:"primera-amistad", unlocked: friendsCount >= 1 },
        { key:"comunidad",       unlocked: friendsCount >= 5 },
        { key:"popular",         unlocked: popular >= 1 },
        { key:"campeon",         unlocked: wins >= 1 },
        { key:"cronista",        unlocked: notesCount >= 1 },
        { key:"diarista",        unlocked: notesCount >= 10 },
        { key:"cumplidor",       unlocked: plansDone >= 1 },
        { key:"madrugador",      unlocked: early },
        { key:"renacido",        unlocked: returned },
      ];

      let existing = [];
      try { existing = app.findRecordsByFilter("achievements_unlocked","user = {:u}","",100,0,{u:uid}); } catch(_) { return; }
      const have = new Set(existing.map((r) => r.get("key")));

      const collection = app.findCollectionByNameOrId("achievements_unlocked");
      const nowIso = new Date().toISOString();
      for (const a of evaluations) {
        if (!a.unlocked || have.has(a.key)) continue;
        try {
          const rec = new Record(collection);
          rec.set("user", uid);
          rec.set("key", a.key);
          rec.set("unlockedAt", nowIso);
          app.save(rec);
          pushNotif(uid, { title:"¡Logro desbloqueado!", body: NAMES[a.key] || a.key, url:"/achievements", tag:`achievement-${a.key}` });
        } catch(_) { /* race on UNIQUE — fine */ }
      }
    }

    reconcile(e.app, userId);
  } catch (err) {
    console.error("[achievements] session-end listener failed:", err);
  }
}, "study_sessions");

// ── friendships: status flipped to accepted ────────────────────────────────
onRecordAfterUpdateSuccess((e) => {
  try {
    const prevStatus = e.record.original().getString("status");
    const newStatus = e.record.getString("status");
    if (newStatus !== "accepted" || prevStatus === "accepted") return;
    const a = e.record.get("userA");
    const b = e.record.get("userB");
    const ids = [a, b].filter(Boolean);

    // (Same inline reconciler as above — kept identical so they evolve together.)
    const NAMES = {"primer-paso":"Primer paso","consistente":"Consistente","veterano":"Veterano","hora-cero":"Hora cero","maratonista":"Maratonista","inmersion-total":"Inmersión total","constante":"Constante","en-llamas":"En llamas","imparable":"Imparable","mistico":"Místico","leyenda":"Leyenda","sin-parpadear":"Sin parpadear","maraton":"Maratón","ultra":"Ultra","curioso":"Curioso","polimata":"Polímata","primera-amistad":"Primera amistad","comunidad":"Comunidad","popular":"Popular","campeon":"Campeón","cronista":"Cronista","diarista":"Diarista","cumplidor":"Cumplidor","madrugador":"Madrugador","renacido":"Renacido","founder":"Founder"};
    function localHourOf(iso,tz){try{const d=new Date(iso);const parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hour12:false}).formatToParts(d);const h=parts.find((p)=>p.type==="hour");return h?parseInt(h.value,10):NaN;}catch(_){return NaN;}}
    function localDayKey(iso,tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));}catch(_){return iso.slice(0,10);}}
    function pushNotif(uid,payload){try{const url=$os.getenv("PUSH_SERVICE_URL")||"http://push-service:3001";const tok=$os.getenv("PUSH_SERVICE_TOKEN")||"";if(!tok)return;$http.send({url:`${url}/dispatch`,method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok}`},body:JSON.stringify({userId:uid,payload}),timeout:5});}catch(_){}}
    function reconcile(app,uid){let tz="UTC";try{const u=app.findRecordById("users",uid);const t=u.get("timezone");if(typeof t==="string"&&t)tz=t;}catch(_){}let sessions=[];try{sessions=app.findRecordsByFilter("study_sessions",'user = {:u} && endedAt != ""',"-startedAt",300,0,{u:uid});}catch(_){}const sessionsCount=sessions.length;let totalSec=0,longestSec=0;const modesSet=new Set(),subjectsSet=new Set(),daySet=new Set();let early=false;for(const s of sessions){const sec=Number(s.get("durationSec")??0);totalSec+=sec;if(sec>longestSec)longestSec=sec;const m=s.get("mode");if(m)modesSet.add(String(m));const sj=s.get("subject");if(sj)subjectsSet.add(String(sj));const st=s.getString("startedAt");if(st){daySet.add(localDayKey(st,tz));if(!early){const h=localHourOf(st,tz);if(!Number.isNaN(h)&&h<7)early=true;}}}let streak=0;if(daySet.size>0){const today=localDayKey(new Date().toISOString(),tz);const[ty,tm,td]=today.split("-").map(Number);const cur=new Date(Date.UTC(ty,tm-1,td,12,0,0));while(true){const k=cur.toISOString().slice(0,10);if(!daySet.has(k))break;streak++;cur.setUTCDate(cur.getUTCDate()-1);}}let returned=false;const gapMs=30*24*60*60*1000;for(let i=0;i<sessions.length-1;i++){const a2=new Date(sessions[i].getString("startedAt")).getTime();const b2=new Date(sessions[i+1].getString("startedAt")).getTime();if(a2-b2>=gapMs){returned=true;break;}}let friendsCount=0;try{friendsCount=app.findRecordsByFilter("friendships",'status = "accepted" && (userA = {:u} || userB = {:u})',"",50,0,{u:uid}).length;}catch(_){}let wins=0,popular=0;try{const myEvents=app.findRecordsByFilter("activity_events","actor = {:u}","",200,0,{u:uid});for(const ev of myEvents)if(ev.get("type")==="challenge_won")wins++;for(const ev of myEvents){if(popular>0)break;try{const r=app.findRecordsByFilter("activity_reactions","event = {:e}","",1,0,{e:ev.id});if(r.length>0)popular=1;}catch(_){}}}catch(_){}let notesCount=0;try{notesCount=app.findRecordsByFilter("study_sessions",'user = {:u} && notes != ""',"",50,0,{u:uid}).length;}catch(_){}let plansDone=0;try{plansDone=app.findRecordsByFilter("study_plans",'user = {:u} && status = "done"',"",50,0,{u:uid}).length;}catch(_){}const evaluations=[{key:"primer-paso",unlocked:sessionsCount>=1},{key:"consistente",unlocked:sessionsCount>=10},{key:"veterano",unlocked:sessionsCount>=100},{key:"hora-cero",unlocked:totalSec>=3600},{key:"maratonista",unlocked:totalSec>=50*3600},{key:"inmersion-total",unlocked:totalSec>=250*3600},{key:"constante",unlocked:streak>=3},{key:"en-llamas",unlocked:streak>=7},{key:"imparable",unlocked:streak>=14},{key:"mistico",unlocked:streak>=30},{key:"leyenda",unlocked:streak>=100},{key:"sin-parpadear",unlocked:longestSec>=45*60},{key:"maraton",unlocked:longestSec>=2*3600},{key:"ultra",unlocked:longestSec>=3*3600},{key:"curioso",unlocked:modesSet.size>=3},{key:"polimata",unlocked:subjectsSet.size>=3},{key:"primera-amistad",unlocked:friendsCount>=1},{key:"comunidad",unlocked:friendsCount>=5},{key:"popular",unlocked:popular>=1},{key:"campeon",unlocked:wins>=1},{key:"cronista",unlocked:notesCount>=1},{key:"diarista",unlocked:notesCount>=10},{key:"cumplidor",unlocked:plansDone>=1},{key:"madrugador",unlocked:early},{key:"renacido",unlocked:returned}];let existing=[];try{existing=app.findRecordsByFilter("achievements_unlocked","user = {:u}","",100,0,{u:uid});}catch(_){return;}const have=new Set(existing.map((r)=>r.get("key")));const collection=app.findCollectionByNameOrId("achievements_unlocked");const nowIso=new Date().toISOString();for(const a3 of evaluations){if(!a3.unlocked||have.has(a3.key))continue;try{const rec=new Record(collection);rec.set("user",uid);rec.set("key",a3.key);rec.set("unlockedAt",nowIso);app.save(rec);pushNotif(uid,{title:"¡Logro desbloqueado!",body:NAMES[a3.key]||a3.key,url:"/achievements",tag:`achievement-${a3.key}`});}catch(_){}}}
    for (const uid of ids) reconcile(e.app, uid);
  } catch (err) {
    console.error("[achievements] friendship-accept listener failed:", err);
  }
}, "friendships");

// ── activity_reactions: reactor's event-author may have just earned popular ─
onRecordAfterCreateSuccess((e) => {
  try {
    const eventId = e.record.get("event");
    if (!eventId) return;
    const ev = e.app.findRecordById("activity_events", eventId);
    const userId = ev.get("actor");
    if (!userId) return;

    const NAMES = {"primer-paso":"Primer paso","consistente":"Consistente","veterano":"Veterano","hora-cero":"Hora cero","maratonista":"Maratonista","inmersion-total":"Inmersión total","constante":"Constante","en-llamas":"En llamas","imparable":"Imparable","mistico":"Místico","leyenda":"Leyenda","sin-parpadear":"Sin parpadear","maraton":"Maratón","ultra":"Ultra","curioso":"Curioso","polimata":"Polímata","primera-amistad":"Primera amistad","comunidad":"Comunidad","popular":"Popular","campeon":"Campeón","cronista":"Cronista","diarista":"Diarista","cumplidor":"Cumplidor","madrugador":"Madrugador","renacido":"Renacido","founder":"Founder"};
    function localHourOf(iso,tz){try{const d=new Date(iso);const parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hour12:false}).formatToParts(d);const h=parts.find((p)=>p.type==="hour");return h?parseInt(h.value,10):NaN;}catch(_){return NaN;}}
    function localDayKey(iso,tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));}catch(_){return iso.slice(0,10);}}
    function pushNotif(uid,payload){try{const url=$os.getenv("PUSH_SERVICE_URL")||"http://push-service:3001";const tok=$os.getenv("PUSH_SERVICE_TOKEN")||"";if(!tok)return;$http.send({url:`${url}/dispatch`,method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok}`},body:JSON.stringify({userId:uid,payload}),timeout:5});}catch(_){}}
    function reconcile(app,uid){let tz="UTC";try{const u=app.findRecordById("users",uid);const t=u.get("timezone");if(typeof t==="string"&&t)tz=t;}catch(_){}let sessions=[];try{sessions=app.findRecordsByFilter("study_sessions",'user = {:u} && endedAt != ""',"-startedAt",300,0,{u:uid});}catch(_){}const sessionsCount=sessions.length;let totalSec=0,longestSec=0;const modesSet=new Set(),subjectsSet=new Set(),daySet=new Set();let early=false;for(const s of sessions){const sec=Number(s.get("durationSec")??0);totalSec+=sec;if(sec>longestSec)longestSec=sec;const m=s.get("mode");if(m)modesSet.add(String(m));const sj=s.get("subject");if(sj)subjectsSet.add(String(sj));const st=s.getString("startedAt");if(st){daySet.add(localDayKey(st,tz));if(!early){const h=localHourOf(st,tz);if(!Number.isNaN(h)&&h<7)early=true;}}}let streak=0;if(daySet.size>0){const today=localDayKey(new Date().toISOString(),tz);const[ty,tm,td]=today.split("-").map(Number);const cur=new Date(Date.UTC(ty,tm-1,td,12,0,0));while(true){const k=cur.toISOString().slice(0,10);if(!daySet.has(k))break;streak++;cur.setUTCDate(cur.getUTCDate()-1);}}let returned=false;const gapMs=30*24*60*60*1000;for(let i=0;i<sessions.length-1;i++){const a2=new Date(sessions[i].getString("startedAt")).getTime();const b2=new Date(sessions[i+1].getString("startedAt")).getTime();if(a2-b2>=gapMs){returned=true;break;}}let friendsCount=0;try{friendsCount=app.findRecordsByFilter("friendships",'status = "accepted" && (userA = {:u} || userB = {:u})',"",50,0,{u:uid}).length;}catch(_){}let wins=0,popular=0;try{const myEvents=app.findRecordsByFilter("activity_events","actor = {:u}","",200,0,{u:uid});for(const ev2 of myEvents)if(ev2.get("type")==="challenge_won")wins++;for(const ev2 of myEvents){if(popular>0)break;try{const r=app.findRecordsByFilter("activity_reactions","event = {:e}","",1,0,{e:ev2.id});if(r.length>0)popular=1;}catch(_){}}}catch(_){}let notesCount=0;try{notesCount=app.findRecordsByFilter("study_sessions",'user = {:u} && notes != ""',"",50,0,{u:uid}).length;}catch(_){}let plansDone=0;try{plansDone=app.findRecordsByFilter("study_plans",'user = {:u} && status = "done"',"",50,0,{u:uid}).length;}catch(_){}const evaluations=[{key:"primer-paso",unlocked:sessionsCount>=1},{key:"consistente",unlocked:sessionsCount>=10},{key:"veterano",unlocked:sessionsCount>=100},{key:"hora-cero",unlocked:totalSec>=3600},{key:"maratonista",unlocked:totalSec>=50*3600},{key:"inmersion-total",unlocked:totalSec>=250*3600},{key:"constante",unlocked:streak>=3},{key:"en-llamas",unlocked:streak>=7},{key:"imparable",unlocked:streak>=14},{key:"mistico",unlocked:streak>=30},{key:"leyenda",unlocked:streak>=100},{key:"sin-parpadear",unlocked:longestSec>=45*60},{key:"maraton",unlocked:longestSec>=2*3600},{key:"ultra",unlocked:longestSec>=3*3600},{key:"curioso",unlocked:modesSet.size>=3},{key:"polimata",unlocked:subjectsSet.size>=3},{key:"primera-amistad",unlocked:friendsCount>=1},{key:"comunidad",unlocked:friendsCount>=5},{key:"popular",unlocked:popular>=1},{key:"campeon",unlocked:wins>=1},{key:"cronista",unlocked:notesCount>=1},{key:"diarista",unlocked:notesCount>=10},{key:"cumplidor",unlocked:plansDone>=1},{key:"madrugador",unlocked:early},{key:"renacido",unlocked:returned}];let existing=[];try{existing=app.findRecordsByFilter("achievements_unlocked","user = {:u}","",100,0,{u:uid});}catch(_){return;}const have=new Set(existing.map((r)=>r.get("key")));const collection=app.findCollectionByNameOrId("achievements_unlocked");const nowIso=new Date().toISOString();for(const a3 of evaluations){if(!a3.unlocked||have.has(a3.key))continue;try{const rec=new Record(collection);rec.set("user",uid);rec.set("key",a3.key);rec.set("unlockedAt",nowIso);app.save(rec);pushNotif(uid,{title:"¡Logro desbloqueado!",body:NAMES[a3.key]||a3.key,url:"/achievements",tag:`achievement-${a3.key}`});}catch(_){}}}
    reconcile(e.app, userId);
  } catch (err) {
    console.error("[achievements] reaction-create listener failed:", err);
  }
}, "activity_reactions");

// ── activity_events: actor may have just earned campeon (challenge_won) ────
onRecordAfterCreateSuccess((e) => {
  try {
    const userId = e.record.get("actor");
    if (!userId) return;

    const NAMES = {"primer-paso":"Primer paso","consistente":"Consistente","veterano":"Veterano","hora-cero":"Hora cero","maratonista":"Maratonista","inmersion-total":"Inmersión total","constante":"Constante","en-llamas":"En llamas","imparable":"Imparable","mistico":"Místico","leyenda":"Leyenda","sin-parpadear":"Sin parpadear","maraton":"Maratón","ultra":"Ultra","curioso":"Curioso","polimata":"Polímata","primera-amistad":"Primera amistad","comunidad":"Comunidad","popular":"Popular","campeon":"Campeón","cronista":"Cronista","diarista":"Diarista","cumplidor":"Cumplidor","madrugador":"Madrugador","renacido":"Renacido","founder":"Founder"};
    function localHourOf(iso,tz){try{const d=new Date(iso);const parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hour12:false}).formatToParts(d);const h=parts.find((p)=>p.type==="hour");return h?parseInt(h.value,10):NaN;}catch(_){return NaN;}}
    function localDayKey(iso,tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));}catch(_){return iso.slice(0,10);}}
    function pushNotif(uid,payload){try{const url=$os.getenv("PUSH_SERVICE_URL")||"http://push-service:3001";const tok=$os.getenv("PUSH_SERVICE_TOKEN")||"";if(!tok)return;$http.send({url:`${url}/dispatch`,method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok}`},body:JSON.stringify({userId:uid,payload}),timeout:5});}catch(_){}}
    function reconcile(app,uid){let tz="UTC";try{const u=app.findRecordById("users",uid);const t=u.get("timezone");if(typeof t==="string"&&t)tz=t;}catch(_){}let sessions=[];try{sessions=app.findRecordsByFilter("study_sessions",'user = {:u} && endedAt != ""',"-startedAt",300,0,{u:uid});}catch(_){}const sessionsCount=sessions.length;let totalSec=0,longestSec=0;const modesSet=new Set(),subjectsSet=new Set(),daySet=new Set();let early=false;for(const s of sessions){const sec=Number(s.get("durationSec")??0);totalSec+=sec;if(sec>longestSec)longestSec=sec;const m=s.get("mode");if(m)modesSet.add(String(m));const sj=s.get("subject");if(sj)subjectsSet.add(String(sj));const st=s.getString("startedAt");if(st){daySet.add(localDayKey(st,tz));if(!early){const h=localHourOf(st,tz);if(!Number.isNaN(h)&&h<7)early=true;}}}let streak=0;if(daySet.size>0){const today=localDayKey(new Date().toISOString(),tz);const[ty,tm,td]=today.split("-").map(Number);const cur=new Date(Date.UTC(ty,tm-1,td,12,0,0));while(true){const k=cur.toISOString().slice(0,10);if(!daySet.has(k))break;streak++;cur.setUTCDate(cur.getUTCDate()-1);}}let returned=false;const gapMs=30*24*60*60*1000;for(let i=0;i<sessions.length-1;i++){const a2=new Date(sessions[i].getString("startedAt")).getTime();const b2=new Date(sessions[i+1].getString("startedAt")).getTime();if(a2-b2>=gapMs){returned=true;break;}}let friendsCount=0;try{friendsCount=app.findRecordsByFilter("friendships",'status = "accepted" && (userA = {:u} || userB = {:u})',"",50,0,{u:uid}).length;}catch(_){}let wins=0,popular=0;try{const myEvents=app.findRecordsByFilter("activity_events","actor = {:u}","",200,0,{u:uid});for(const ev2 of myEvents)if(ev2.get("type")==="challenge_won")wins++;for(const ev2 of myEvents){if(popular>0)break;try{const r=app.findRecordsByFilter("activity_reactions","event = {:e}","",1,0,{e:ev2.id});if(r.length>0)popular=1;}catch(_){}}}catch(_){}let notesCount=0;try{notesCount=app.findRecordsByFilter("study_sessions",'user = {:u} && notes != ""',"",50,0,{u:uid}).length;}catch(_){}let plansDone=0;try{plansDone=app.findRecordsByFilter("study_plans",'user = {:u} && status = "done"',"",50,0,{u:uid}).length;}catch(_){}const evaluations=[{key:"primer-paso",unlocked:sessionsCount>=1},{key:"consistente",unlocked:sessionsCount>=10},{key:"veterano",unlocked:sessionsCount>=100},{key:"hora-cero",unlocked:totalSec>=3600},{key:"maratonista",unlocked:totalSec>=50*3600},{key:"inmersion-total",unlocked:totalSec>=250*3600},{key:"constante",unlocked:streak>=3},{key:"en-llamas",unlocked:streak>=7},{key:"imparable",unlocked:streak>=14},{key:"mistico",unlocked:streak>=30},{key:"leyenda",unlocked:streak>=100},{key:"sin-parpadear",unlocked:longestSec>=45*60},{key:"maraton",unlocked:longestSec>=2*3600},{key:"ultra",unlocked:longestSec>=3*3600},{key:"curioso",unlocked:modesSet.size>=3},{key:"polimata",unlocked:subjectsSet.size>=3},{key:"primera-amistad",unlocked:friendsCount>=1},{key:"comunidad",unlocked:friendsCount>=5},{key:"popular",unlocked:popular>=1},{key:"campeon",unlocked:wins>=1},{key:"cronista",unlocked:notesCount>=1},{key:"diarista",unlocked:notesCount>=10},{key:"cumplidor",unlocked:plansDone>=1},{key:"madrugador",unlocked:early},{key:"renacido",unlocked:returned}];let existing=[];try{existing=app.findRecordsByFilter("achievements_unlocked","user = {:u}","",100,0,{u:uid});}catch(_){return;}const have=new Set(existing.map((r)=>r.get("key")));const collection=app.findCollectionByNameOrId("achievements_unlocked");const nowIso=new Date().toISOString();for(const a3 of evaluations){if(!a3.unlocked||have.has(a3.key))continue;try{const rec=new Record(collection);rec.set("user",uid);rec.set("key",a3.key);rec.set("unlockedAt",nowIso);app.save(rec);pushNotif(uid,{title:"¡Logro desbloqueado!",body:NAMES[a3.key]||a3.key,url:"/achievements",tag:`achievement-${a3.key}`});}catch(_){}}}
    reconcile(e.app, userId);
  } catch (err) {
    console.error("[achievements] activity-event listener failed:", err);
  }
}, "activity_events");

// ── study_plans: plan flipped to done — cumplidor may unlock ───────────────
onRecordAfterUpdateSuccess((e) => {
  try {
    const prevStatus = e.record.original().getString("status");
    const newStatus = e.record.getString("status");
    if (newStatus !== "done" || prevStatus === "done") return;
    const userId = e.record.get("user");
    if (!userId) return;

    const NAMES = {"primer-paso":"Primer paso","consistente":"Consistente","veterano":"Veterano","hora-cero":"Hora cero","maratonista":"Maratonista","inmersion-total":"Inmersión total","constante":"Constante","en-llamas":"En llamas","imparable":"Imparable","mistico":"Místico","leyenda":"Leyenda","sin-parpadear":"Sin parpadear","maraton":"Maratón","ultra":"Ultra","curioso":"Curioso","polimata":"Polímata","primera-amistad":"Primera amistad","comunidad":"Comunidad","popular":"Popular","campeon":"Campeón","cronista":"Cronista","diarista":"Diarista","cumplidor":"Cumplidor","madrugador":"Madrugador","renacido":"Renacido","founder":"Founder"};
    function localHourOf(iso,tz){try{const d=new Date(iso);const parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hour12:false}).formatToParts(d);const h=parts.find((p)=>p.type==="hour");return h?parseInt(h.value,10):NaN;}catch(_){return NaN;}}
    function localDayKey(iso,tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));}catch(_){return iso.slice(0,10);}}
    function pushNotif(uid,payload){try{const url=$os.getenv("PUSH_SERVICE_URL")||"http://push-service:3001";const tok=$os.getenv("PUSH_SERVICE_TOKEN")||"";if(!tok)return;$http.send({url:`${url}/dispatch`,method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok}`},body:JSON.stringify({userId:uid,payload}),timeout:5});}catch(_){}}
    function reconcile(app,uid){let tz="UTC";try{const u=app.findRecordById("users",uid);const t=u.get("timezone");if(typeof t==="string"&&t)tz=t;}catch(_){}let sessions=[];try{sessions=app.findRecordsByFilter("study_sessions",'user = {:u} && endedAt != ""',"-startedAt",300,0,{u:uid});}catch(_){}const sessionsCount=sessions.length;let totalSec=0,longestSec=0;const modesSet=new Set(),subjectsSet=new Set(),daySet=new Set();let early=false;for(const s of sessions){const sec=Number(s.get("durationSec")??0);totalSec+=sec;if(sec>longestSec)longestSec=sec;const m=s.get("mode");if(m)modesSet.add(String(m));const sj=s.get("subject");if(sj)subjectsSet.add(String(sj));const st=s.getString("startedAt");if(st){daySet.add(localDayKey(st,tz));if(!early){const h=localHourOf(st,tz);if(!Number.isNaN(h)&&h<7)early=true;}}}let streak=0;if(daySet.size>0){const today=localDayKey(new Date().toISOString(),tz);const[ty,tm,td]=today.split("-").map(Number);const cur=new Date(Date.UTC(ty,tm-1,td,12,0,0));while(true){const k=cur.toISOString().slice(0,10);if(!daySet.has(k))break;streak++;cur.setUTCDate(cur.getUTCDate()-1);}}let returned=false;const gapMs=30*24*60*60*1000;for(let i=0;i<sessions.length-1;i++){const a2=new Date(sessions[i].getString("startedAt")).getTime();const b2=new Date(sessions[i+1].getString("startedAt")).getTime();if(a2-b2>=gapMs){returned=true;break;}}let friendsCount=0;try{friendsCount=app.findRecordsByFilter("friendships",'status = "accepted" && (userA = {:u} || userB = {:u})',"",50,0,{u:uid}).length;}catch(_){}let wins=0,popular=0;try{const myEvents=app.findRecordsByFilter("activity_events","actor = {:u}","",200,0,{u:uid});for(const ev2 of myEvents)if(ev2.get("type")==="challenge_won")wins++;for(const ev2 of myEvents){if(popular>0)break;try{const r=app.findRecordsByFilter("activity_reactions","event = {:e}","",1,0,{e:ev2.id});if(r.length>0)popular=1;}catch(_){}}}catch(_){}let notesCount=0;try{notesCount=app.findRecordsByFilter("study_sessions",'user = {:u} && notes != ""',"",50,0,{u:uid}).length;}catch(_){}let plansDone=0;try{plansDone=app.findRecordsByFilter("study_plans",'user = {:u} && status = "done"',"",50,0,{u:uid}).length;}catch(_){}const evaluations=[{key:"primer-paso",unlocked:sessionsCount>=1},{key:"consistente",unlocked:sessionsCount>=10},{key:"veterano",unlocked:sessionsCount>=100},{key:"hora-cero",unlocked:totalSec>=3600},{key:"maratonista",unlocked:totalSec>=50*3600},{key:"inmersion-total",unlocked:totalSec>=250*3600},{key:"constante",unlocked:streak>=3},{key:"en-llamas",unlocked:streak>=7},{key:"imparable",unlocked:streak>=14},{key:"mistico",unlocked:streak>=30},{key:"leyenda",unlocked:streak>=100},{key:"sin-parpadear",unlocked:longestSec>=45*60},{key:"maraton",unlocked:longestSec>=2*3600},{key:"ultra",unlocked:longestSec>=3*3600},{key:"curioso",unlocked:modesSet.size>=3},{key:"polimata",unlocked:subjectsSet.size>=3},{key:"primera-amistad",unlocked:friendsCount>=1},{key:"comunidad",unlocked:friendsCount>=5},{key:"popular",unlocked:popular>=1},{key:"campeon",unlocked:wins>=1},{key:"cronista",unlocked:notesCount>=1},{key:"diarista",unlocked:notesCount>=10},{key:"cumplidor",unlocked:plansDone>=1},{key:"madrugador",unlocked:early},{key:"renacido",unlocked:returned}];let existing=[];try{existing=app.findRecordsByFilter("achievements_unlocked","user = {:u}","",100,0,{u:uid});}catch(_){return;}const have=new Set(existing.map((r)=>r.get("key")));const collection=app.findCollectionByNameOrId("achievements_unlocked");const nowIso=new Date().toISOString();for(const a3 of evaluations){if(!a3.unlocked||have.has(a3.key))continue;try{const rec=new Record(collection);rec.set("user",uid);rec.set("key",a3.key);rec.set("unlockedAt",nowIso);app.save(rec);pushNotif(uid,{title:"¡Logro desbloqueado!",body:NAMES[a3.key]||a3.key,url:"/achievements",tag:`achievement-${a3.key}`});}catch(_){}}}
    reconcile(e.app, userId);
  } catch (err) {
    console.error("[achievements] plan-done listener failed:", err);
  }
}, "study_plans");
