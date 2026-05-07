// Migration 010 — Make study_sessions.durationSec optional
//
// Why: PocketBase 0.23 NumberField with `required: true` treats the value 0
// as "blank" and rejects creation. But the frontend creates the session
// with durationSec=0 (no time elapsed yet) and PATCHes the real duration
// on stop. Making the field optional lets the create succeed; the hook
// still defaults to 0 server-side.
//
// Reference: F2 timer flow.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — relax required
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    const field = collection.fields.getByName("durationSec");
    if (field) {
      field.required = false;
      app.save(collection);
    }
  },

  // DOWN — restore required
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    const field = collection.fields.getByName("durationSec");
    if (field) {
      field.required = true;
      app.save(collection);
    }
  }
);
