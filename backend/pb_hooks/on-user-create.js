/// <reference path="../pb_data/types.d.ts" />

// Top-level log to confirm file is loaded into JSVM
console.log("[on-user-create.js] file loaded by PB JSVM");

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return s;
}

// Try filtered version first
onRecordCreate((e) => {
  console.log("[hook] onRecordCreate fired for users — email:", e.record.get("email"));

  if (!e.record.get("weeklyGoalMinutes")) e.record.set("weeklyGoalMinutes", 600);
  if (!e.record.get("timezone")) e.record.set("timezone", "America/Argentina/Buenos_Aires");
  if (!e.record.get("theme")) e.record.set("theme", "auto");
  if (!e.record.get("accentColor")) e.record.set("accentColor", "sage");

  if (!e.record.get("friendCode")) {
    const code = generateCode();
    e.record.set("friendCode", code);
    console.log("[hook] friendCode generated:", code);
  }

  e.next();
}, "users");

// Also bind without filter to detect if filter is the issue
onRecordCreate((e) => {
  if (e.record.collection() && e.record.collection().name === "users") {
    console.log("[hook UNFILTERED] caught users create — email:", e.record.get("email"));
  }
  e.next();
});
