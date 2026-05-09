// Migration 016 — Create the "subjects" collection
//
// Each user manages their own list of subjects (materias) to tag study
// sessions with. A session may have zero or one subject; subjects are
// optional so they don't block quick starts.
//
// Schema:
//   - user   : relation → users, cascade delete (subjects vanish with the user)
//   - name   : text, required, max 60
//   - color  : text, required, hex like "#FFC8DE" (max 9 chars to allow #RRGGBBAA)
//   - emoji  : text, optional, max 8 (covers compound emoji sequences)
//
// API rules (read/write = own):
//   listRule / viewRule  : "@request.auth.id != '' && user = @request.auth.id"
//   createRule           : same
//   updateRule / deleteRule : same

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: "subjects",
      type: "base",
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
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
      name: "name",
      required: true,
      max: 60,
    }));

    collection.fields.addAt(-1, new TextField({
      name: "color",
      required: true,
      max: 9, // allow #RRGGBBAA
    }));

    collection.fields.addAt(-1, new TextField({
      name: "emoji",
      required: false,
      max: 8,
    }));

    // Auto-managed timestamps
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
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("subjects");
    app.delete(collection);
  }
);
