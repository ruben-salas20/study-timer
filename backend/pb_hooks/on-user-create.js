/// <reference path="../pb_data/types.d.ts" />

// Bootstrap hook = fires after PB has fully initialized.
// If we see "ON-USER-CREATE FILE LOADED" in logs, the file is being read.
onBootstrap((e) => {
  e.next();
  $app.logger().info("ON-USER-CREATE FILE LOADED — hooks file is being read by PB");
});

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return s;
}

// Record-level hook (before save). Filtered to "users" collection.
onRecordCreate((e) => {
  $app.logger().info("USER CREATE HOOK FIRED", "email", e.record.get("email"));

  if (!e.record.get("weeklyGoalMinutes")) e.record.set("weeklyGoalMinutes", 600);
  if (!e.record.get("timezone")) e.record.set("timezone", "America/Argentina/Buenos_Aires");
  if (!e.record.get("theme")) e.record.set("theme", "auto");
  if (!e.record.get("accentColor")) e.record.set("accentColor", "sage");

  if (!e.record.get("friendCode")) {
    const code = generateCode();
    e.record.set("friendCode", code);
    $app.logger().info("FRIEND CODE GENERATED", "code", code);
  }

  e.next();
}, "users");

// HTTP-request hook (before request validation/save). Filtered to "users".
onRecordCreateRequest((e) => {
  $app.logger().info("USER CREATE REQUEST HOOK FIRED", "email", e.record.get("email"));

  if (!e.record.get("friendCode")) {
    const code = generateCode();
    e.record.set("friendCode", code);
  }
  if (!e.record.get("weeklyGoalMinutes")) e.record.set("weeklyGoalMinutes", 600);
  if (!e.record.get("timezone")) e.record.set("timezone", "America/Argentina/Buenos_Aires");
  if (!e.record.get("theme")) e.record.set("theme", "auto");
  if (!e.record.get("accentColor")) e.record.set("accentColor", "sage");

  e.next();
}, "users");
