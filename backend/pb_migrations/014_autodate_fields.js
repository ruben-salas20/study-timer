// Migration 014 — Add `created` and `updated` autodate fields to all collections
//
// Why: PocketBase 0.23 does NOT add `created`/`updated` autodate fields by
// default to user-created collections. Without them:
//   - Default sort (-created) fails with 400 "invalid sort field"
//   - Pagination across collections is non-deterministic
//   - Hooks/code that reads `record.created` get undefined
//
// Affected collections (5):
//   study_sessions, friendships, challenges, challenge_participants, push_subscriptions
//
// Why two pre-existing fields suffice:
//   PB 0.23 stores autodate fields as ISO strings, populated automatically by
//   the framework on Create / Update events. They cannot be backfilled by the
//   migration itself for existing rows — those rows will have empty strings
//   until they are next saved. For our app this is acceptable since we sort
//   by domain fields (startedAt, joinedAt, startsAt) where we need ordering.

/// <reference path="../pb_data/types.d.ts" />

const COLLECTIONS = [
  "study_sessions",
  "friendships",
  "challenges",
  "challenge_participants",
  "push_subscriptions",
];

migrate(
  // UP — add autodate fields to each collection
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);

      // Skip if already has created (idempotent)
      if (!collection.fields.getByName("created")) {
        collection.fields.addAt(-1, new AutodateField({
          name: "created",
          onCreate: true,
          onUpdate: false,
        }));
      }

      if (!collection.fields.getByName("updated")) {
        collection.fields.addAt(-1, new AutodateField({
          name: "updated",
          onCreate: true,
          onUpdate: true,
        }));
      }

      app.save(collection);
    }
  },

  // DOWN — remove the autodate fields
  (app) => {
    for (const name of COLLECTIONS) {
      try {
        const collection = app.findCollectionByNameOrId(name);

        const created = collection.fields.getByName("created");
        if (created) collection.fields.remove(created);

        const updated = collection.fields.getByName("updated");
        if (updated) collection.fields.remove(updated);

        app.save(collection);
      } catch (_) { /* collection may not exist */ }
    }
  }
);
