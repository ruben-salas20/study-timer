// pb_hooks/on-user-create.js
// Fires when a new user record is being created (model-layer hook).
//
// Responsibilities:
//   1. Auto-generate a unique 6-character uppercase alphanumeric friendCode
//      if the record does not already have one set.
//   2. Retry on collision up to MAX_RETRIES times before failing.
//   3. Set timezone, weeklyGoalMinutes, theme, accentColor defaults if missing.
//
// Note on hook choice:
//   Migration 002 made friendCode optional at the schema level so that the
//   timing of validation vs. hook execution does not matter. We use
//   onRecordCreate (model lifecycle) which fires for ANY user creation —
//   HTTP API, admin UI, or programmatic — making this the canonical place
//   to enforce the invariant.
//
// Reference: ARCHITECTURE.md §6.1 + tasks T05

/// <reference path="../pb_data/types.d.ts" />

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LEN = 6;
const MAX_RETRIES = 5;

function generateCode() {
  return $security.randomStringWithAlphabet(CODE_LEN, CHARS);
}

onRecordCreate((e) => {
  // DEBUG: confirm hook fires (visible in `docker compose logs pocketbase`)
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

  // Generate friendCode if not already provided
  const existingCode = e.record.get("friendCode");
  if (!existingCode || String(existingCode).trim() === "") {
    let code = "";
    let attempts = 0;
    let found = false;

    while (attempts < MAX_RETRIES) {
      code = generateCode();
      attempts++;

      try {
        e.app.findFirstRecordByFilter(
          "users",
          `friendCode = {:code}`,
          { code: code }
        );
        // record exists → collision, retry
      } catch (_) {
        // not found → unique
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(
        `Failed to generate unique friendCode after ${MAX_RETRIES} attempts`
      );
    }

    e.record.set("friendCode", code);
  }

  e.next();
}, "users");
