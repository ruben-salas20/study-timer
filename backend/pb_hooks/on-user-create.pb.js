// pb_hooks/on-user-create.pb.js
// Fires when a new user record is being created.
//
// IMPORTANT:
//   1. PocketBase only loads hook files with `.pb.js` extension.
//   2. Goja JSVM runs each callback in an isolated scope — top-level
//      function/const declarations are NOT visible inside the callback.
//      All helpers must be defined INSIDE the handler.

/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
  // Inline helpers — JSVM does not share file-level scope with hook callbacks.
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function generateCode() {
    let s = "";
    for (let i = 0; i < 6; i++) {
      s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return s;
  }

  // Set defaults if missing
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
