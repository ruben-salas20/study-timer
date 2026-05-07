// pb_hooks/on-challenge-create.js
// Fires after a new challenges record is successfully created (model-layer hook).
//
// Responsibility:
//   - Automatically create a challenge_participants row for the creator
//     so they are enrolled in their own challenge immediately.
//
// Flow:
//   1. e.next() — let PocketBase persist the challenge record
//   2. Build and save a challenge_participants record linking creator→challenge
//
// Note: If the participant record creation fails (e.g. data integrity), we log
// the error but do NOT abort — the challenge itself was already saved. The UI
// can handle re-enrollment gracefully via joinChallenge().
//
// Reference: ARCHITECTURE.md §4, F4 scope.

/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
  e.next();

  try {
    const challengesCollection = e.app.findCollectionByNameOrId("challenge_participants");

    const participant = new Record(challengesCollection, {
      challenge: e.record.id,
      user: e.record.get("createdBy"),
      joinedAt: new Date().toISOString(),
      progressSec: 0,
      streakDays: 0,
    });

    e.app.save(participant);
  } catch (err) {
    // Log but don't abort — challenge is already committed
    console.error("[on-challenge-create] Failed to add creator as participant:", err);
  }
}, "challenges");
