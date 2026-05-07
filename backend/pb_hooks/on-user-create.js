/// <reference path="../pb_data/types.d.ts" />

// Use $app.logger at module-level + inside hooks. Goja JSVM eagerly loads
// hook files at boot, so this top-level call should appear in the log.
$app.logger().info("[on-user-create.js] LOADED at module init");

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return s;
}

onRecordCreate((e) => {
  $app.logger().info("[hook] onRecordCreate fired for users", "email", e.record.get("email"));

  if (!e.record.get("weeklyGoalMinutes")) e.record.set("weeklyGoalMinutes", 600);
  if (!e.record.get("timezone")) e.record.set("timezone", "America/Argentina/Buenos_Aires");
  if (!e.record.get("theme")) e.record.set("theme", "auto");
  if (!e.record.get("accentColor")) e.record.set("accentColor", "sage");

  if (!e.record.get("friendCode")) {
    const code = generateCode();
    e.record.set("friendCode", code);
    $app.logger().info("[hook] friendCode generated", "code", code);
  }

  e.next();
}, "users");
