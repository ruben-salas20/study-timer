// Migration 017 — Add optional "subject" relation to study_sessions
//
// A session may belong to one subject. The relation is optional (subjects
// are opt-in) and uses no cascade — if the user deletes a subject, sessions
// keep their reference but it points to a non-existent record. The frontend
// renders that as "Sin materia" via expand fallback.
//
// (We deliberately don't use cascadeDelete because a user might delete a
// subject they no longer use without wanting to lose the historical hours
// tagged with it — those hours should still appear in totals.)

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    const subjects = app.findCollectionByNameOrId("subjects");

    collection.fields.addAt(-1, new RelationField({
      name: "subject",
      required: false,
      collectionId: subjects.id,
      cascadeDelete: false,
      maxSelect: 1,
    }));

    app.save(collection);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    const field = collection.fields.getByName("subject");
    if (field) {
      collection.fields.removeByName("subject");
      app.save(collection);
    }
  }
);
