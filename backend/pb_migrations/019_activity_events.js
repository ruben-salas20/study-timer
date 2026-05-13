// Migration 019 — Create the "activity_events" collection
//
// Powers the /feed view: a chronological stream of meaningful events from
// the authenticated user and their friends.
//
// Schema:
//   - actor   : relation → users, cascadeDelete: true
//   - type    : select (session_completed | challenge_won), required
//   - payload : json, nullable — type-specific data (see frontend renderer)
//   - created / updated : auto
//
// API rules:
//   listRule / viewRule  : any authenticated user (client filters by
//                          their own friend list)
//   create / update / delete : "" (server-only, written from hooks)

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: "activity_events",
      type: "base",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [],
    });

    collection.fields.addAt(-1, new RelationField({
      name: "actor",
      required: true,
      collectionId: app.findCollectionByNameOrId("users").id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    collection.fields.addAt(-1, new SelectField({
      name: "type",
      required: true,
      maxSelect: 1,
      values: ["session_completed", "challenge_won"],
    }));

    collection.fields.addAt(-1, new JSONField({
      name: "payload",
      required: false,
    }));

    // PB 0.23 does NOT add `created`/`updated` autodate fields automatically
    // to programmatically created collections. We declare them explicitly so
    // sort and index by created work as expected (see migration 014).
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

    // Indexes — feed reads are always by actor (filter) and created (sort).
    const fresh = app.findCollectionByNameOrId("activity_events");
    fresh.indexes = [
      "CREATE INDEX idx_activity_actor ON activity_events (actor)",
      "CREATE INDEX idx_activity_created ON activity_events (created)",
    ];
    app.save(fresh);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("activity_events");
    app.delete(collection);
  }
);
