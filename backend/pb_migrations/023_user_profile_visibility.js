// Migration 023 — Add `profileVisibility` JSON field to the users collection.
//
// Stores per-user choices about what to surface on their public profile
// page (/u/:id). Shape (interpreted by the frontend):
//   {
//     stats?: {
//       streak?: boolean
//       total?: boolean
//       week?: boolean
//       bestDay?: boolean
//     }
//     achievements?: boolean
//   }
//
// Defaults: empty object → frontend treats every section as visible (back-
// compat with users who don't set anything).

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("users");

    if (!collection.fields.getByName("profileVisibility")) {
      collection.fields.addAt(-1, new JSONField({
        name: "profileVisibility",
        required: false,
      }));
    }

    app.save(collection);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    const field = collection.fields.getByName("profileVisibility");
    if (field) collection.fields.removeByName("profileVisibility");
    app.save(collection);
  }
);
