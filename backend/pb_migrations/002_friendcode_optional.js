// Migration 002 — Make friendCode optional at schema level
//
// Why: the auto-generation hook fires on the create-request lifecycle, but
// schema validation in PocketBase 0.23.x rejects required-field-blank errors
// before the hook completes its mutation. To avoid that race, we drop the
// schema-level `required: true` constraint. The uniqueness constraint stays.
// The hook (pb_hooks/on-user-create.js) remains the source of truth for
// generation; this migration only relaxes the validator.
//
// If the hook silently fails, friendCode would be empty (degraded state) but
// the registration succeeds — which is observable, vs. the previous behavior
// where ALL registrations failed.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — make friendCode optional
  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    const field = collection.fields.getByName("friendCode");
    if (field) {
      field.required = false;
      app.save(collection);
    }
  },

  // DOWN — restore required
  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    const field = collection.fields.getByName("friendCode");
    if (field) {
      field.required = true;
      app.save(collection);
    }
  }
);
