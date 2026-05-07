// pb_hooks/on-user-create.pb.js
// Fires when a new user record is being created.
//
// IMPORTANT: PocketBase only loads hook files with `.pb.js` extension.
// Plain `.js` files in the hooks dir are silently ignored.
//
// Responsibilities:
//   1. Auto-generate a 6-character uppercase alphanumeric friendCode if empty
//   2. Set timezone, weeklyGoalMinutes, theme, accentColor defaults if missing
//
// Collision strategy: NONE (36^6 ≈ 2.1 billion possible codes; collision
// probability for tens of users is effectively zero).

/// <reference path="../pb_data/types.d.ts" />

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return s;
}

onRecordCreate((e) => {
  if (!e.record.get("friendCode")) {
    e.record.set("friendCode", generateCode());
  }
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

  e.next();
}, "users");
