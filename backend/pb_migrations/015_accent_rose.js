// Migration 015 — Add "rose" to accentColor select values
//
// Hex #FFC8DE — pastel pink. Joins existing sage/blue/warm/mono.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    const field = collection.fields.getByName("accentColor");
    if (field) {
      field.values = ["sage", "blue", "warm", "mono", "rose"];
      app.save(collection);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    const field = collection.fields.getByName("accentColor");
    if (field) {
      field.values = ["sage", "blue", "warm", "mono"];
      app.save(collection);
    }
  }
);
