// pb_hooks/on-user-create.js
// Fires before a new user record is created in the "users" auth collection.
//
// Responsibilities:
//   1. Auto-generate a unique 6-character uppercase alphanumeric friendCode
//      if the record does not already have one set.
//   2. Retry on collision up to MAX_RETRIES times before failing.
//   3. Set timezone and weeklyGoalMinutes defaults if missing.
//
// PocketBase 0.23.x hook API:
//   onRecordCreate(handler, ...collections) — new hook name in 0.23.x
//   handler receives (e) where e.record is the record, e.app is the app
//
// Reference: ARCHITECTURE.md §6.1 + tasks T05

/// <reference path="../pb_data/types.d.ts" />

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LEN = 6;
const MAX_RETRIES = 5;

/**
 * Generate a random 6-character uppercase alphanumeric string.
 * Uses $security.randomStringWithAlphabet for cryptographic randomness.
 */
function generateCode() {
  return $security.randomStringWithAlphabet(CODE_LEN, CHARS);
}

onRecordCreate((e) => {
  // Only process the "users" collection
  if (e.record.collection().name !== "users") {
    e.next();
    return;
  }

  // Set defaults for optional fields if not provided
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

  // Generate friendCode if not already set
  const existingCode = e.record.get("friendCode");
  if (!existingCode || existingCode.trim() === "") {
    let code = "";
    let attempts = 0;
    let found = false;

    while (attempts < MAX_RETRIES) {
      code = generateCode();
      attempts++;

      // Check for collision against existing records
      try {
        e.app.findFirstRecordByFilter(
          "users",
          `friendCode = {:code}`,
          { code: code }
        );
        // Record exists → collision, try again
      } catch (_) {
        // findFirstRecordByFilter throws when not found → code is unique
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
});
