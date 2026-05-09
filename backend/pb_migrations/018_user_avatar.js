// Migration 018 — Add avatar fields to the "users" collection
//
// Two complementary fields so we can support both modes:
//   - avatar       : FileField, optional, single image (max 2 MB) — uploaded photo
//   - avatarPreset : TextField, optional, max 40 — key of a preset cuy variant
//                    bundled in the frontend at /avatars/presets/{key}.png
//
// The frontend renders priority: avatar file > avatarPreset > initial-letter.
// Both fields readable by anyone authenticated (rules unchanged from the
// existing users collection — search/list rules already permit cross-user
// reads of these public-facing fields).

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("users");

    if (!collection.fields.getByName("avatar")) {
      collection.fields.addAt(-1, new FileField({
        name: "avatar",
        required: false,
        maxSelect: 1,
        maxSize: 2 * 1024 * 1024, // 2 MB
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      }));
    }

    if (!collection.fields.getByName("avatarPreset")) {
      collection.fields.addAt(-1, new TextField({
        name: "avatarPreset",
        required: false,
        max: 40,
      }));
    }

    app.save(collection);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    if (collection.fields.getByName("avatar")) {
      collection.fields.removeByName("avatar");
    }
    if (collection.fields.getByName("avatarPreset")) {
      collection.fields.removeByName("avatarPreset");
    }
    app.save(collection);
  }
);
