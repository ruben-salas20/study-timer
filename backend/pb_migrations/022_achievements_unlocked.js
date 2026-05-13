// Migration 022 — Create the "achievements_unlocked" collection
//
// Each row records that a single user unlocked a single achievement key.
// The catalogue itself (display names, icons, tiers, descriptions) lives in
// the frontend at features/achievements/lib/registry.ts so we don't need a
// "definitions" collection in PB — keys are the contract.
//
// Schema:
//   - user        : relation → users, cascadeDelete: true, required
//   - key         : text, max 50, required (frontend registry key)
//   - unlockedAt  : datetime, required
//   - created / updated : auto
//
// Rules:
//   listRule / viewRule  : any authenticated user (achievements are public
//                          metadata of the profile)
//   create / update / delete : null (server-only — hooks insert)
//
// Indexes:
//   - UNIQUE (user, key) — idempotent unlocks; the hook reconciler relies on
//     it to fail-safe on race conditions
//   - INDEX (user)        — common lookup pattern

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: "achievements_unlocked",
      type: "base",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [],
    });

    collection.fields.addAt(-1, new RelationField({
      name: "user",
      required: true,
      collectionId: app.findCollectionByNameOrId("users").id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    collection.fields.addAt(-1, new TextField({
      name: "key",
      required: true,
      max: 50,
    }));

    collection.fields.addAt(-1, new DateField({
      name: "unlockedAt",
      required: true,
    }));

    collection.fields.addAt(-1, new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    collection.fields.addAt(-1, new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));

    app.save(collection);

    const fresh = app.findCollectionByNameOrId("achievements_unlocked");
    fresh.indexes = [
      "CREATE UNIQUE INDEX idx_achievements_unique ON achievements_unlocked (user, key)",
      "CREATE INDEX idx_achievements_user ON achievements_unlocked (user)",
    ];
    app.save(fresh);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("achievements_unlocked");
    app.delete(collection);
  }
);
