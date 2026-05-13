// Migration 020 — Create the "activity_reactions" collection
//
// Powers the social loop on the feed: any authenticated user can tap a
// reaction button (🔥 ❤️ 👏 🚀 🧠) on a friend's event. One row per
// (event, user, emoji); deleting your row "un-reacts".
//
// Schema:
//   - event   : relation → activity_events, cascadeDelete: true
//   - user    : relation → users, cascadeDelete: true
//   - emoji   : text, required, max 8 (single emoji is 1-4 chars but ZWJ
//               sequences can be longer)
//   - created / updated : auto
//
// API rules:
//   listRule / viewRule  : any authenticated user (feed is shared)
//   createRule           : user = @request.auth.id  (no impersonation)
//   updateRule           : null (immutable — to change emoji, delete + create)
//   deleteRule           : user = @request.auth.id  (only your own)

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: "activity_reactions",
      type: "base",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: null,
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [],
    });

    collection.fields.addAt(-1, new RelationField({
      name: "event",
      required: true,
      collectionId: app.findCollectionByNameOrId("activity_events").id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    collection.fields.addAt(-1, new RelationField({
      name: "user",
      required: true,
      collectionId: app.findCollectionByNameOrId("users").id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    collection.fields.addAt(-1, new TextField({
      name: "emoji",
      required: true,
      max: 8,
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

    // Unique compound index — one reaction-emoji per user per event.
    // Plus a lookup index for the common feed read pattern (event IN [...]).
    const fresh = app.findCollectionByNameOrId("activity_reactions");
    fresh.indexes = [
      "CREATE UNIQUE INDEX idx_activity_reactions_unique ON activity_reactions (event, user, emoji)",
      "CREATE INDEX idx_activity_reactions_event ON activity_reactions (event)",
    ];
    app.save(fresh);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("activity_reactions");
    app.delete(collection);
  }
);
