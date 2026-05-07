// pb_hooks/on-user-create.js
// Fires when a new user record is being created (model-layer hook).
//
// Responsibilities:
//   1. Auto-generate a 6-character uppercase alphanumeric friendCode if empty
//   2. Set timezone, weeklyGoalMinutes, theme, accentColor defaults if missing
//
// Collision strategy: NONE.
//   With 36^6 = ~2.1 billion possible codes and tens of users, collision
//   probability is effectively 0 (birthday paradox at 50% with ~52,000 users).
//   PB still enforces uniqueness via the schema's unique constraint, so a
//   theoretical duplicate would surface as a save error. For our scale,
//   single-attempt generation is safe and avoids JSVM API surprises.
//
// Reference: ARCHITECTURE.md §6.1

/// <reference path="../pb_data/types.d.ts" />

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LEN = 6;

function generateCode() {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return s;
}

onRecordCreate((e) => {
  $app.logger().info("on-user-create hook fired", "email", e.record.get("email"));

  // Defaults for optional profile fields
  if (!e.record.get("weeklyGoalMinutes")) {
    e.record.set("weeklyGoalMinutes", 600);
  }
  if (!e.record.get("timezone")) {
    e.record.set("timezone", "America/Argentina/Buenos_Aires");
  }
  if (!e.record.get("theme")) {
    e.record.set("theme", "auto");
  }
  if (!e.record.get("accentColor")) {
    e.record.set("accentColor", "sage");
  }

  // Generate friendCode if empty
  const existing = e.record.get("friendCode");
  if (!existing || String(existing).trim() === "") {
    const code = generateCode();
    e.record.set("friendCode", code);
    $app.logger().info("friendCode generated", "code", code);
  }

  e.next();
}, "users");
