// Migration 008 — Create the "push_subscriptions" collection
//
// Schema (per ARCHITECTURE.md §4 and F6 scope):
//   - user        : relation → users (cascade delete)
//   - endpoint    : text required (unique per user enforced by API rules + client)
//   - p256dh      : text required (base64-url encoded public key)
//   - auth        : text required (base64-url encoded auth secret)
//   - userAgent   : text nullable max 500 chars
//   - created/updated: auto (PocketBase built-in)
//
// API rules:
//   listRule / viewRule : @request.auth.id != "" && user = @request.auth.id
//   createRule          : @request.auth.id != "" && @request.body.user = @request.auth.id
//   updateRule          : @request.auth.id != "" && user = @request.auth.id
//   deleteRule          : @request.auth.id != "" && user = @request.auth.id
//
// Reference: ARCHITECTURE.md §4, F6 scope.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — create push_subscriptions collection
  (app) => {
    const usersCollection = app.findCollectionByNameOrId("users");

    const collection = new Collection({
      name: "push_subscriptions",
      type: "base",
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [],
    });

    // user — relation to users, cascade delete
    collection.fields.addAt(-1, new RelationField({
      name: "user",
      required: true,
      collectionId: usersCollection.id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    // endpoint — the push subscription endpoint URL
    collection.fields.addAt(-1, new TextField({
      name: "endpoint",
      required: true,
      max: 2048,
    }));

    // p256dh — base64-url encoded public key for payload encryption
    collection.fields.addAt(-1, new TextField({
      name: "p256dh",
      required: true,
      max: 512,
    }));

    // auth — base64-url encoded auth secret for payload encryption
    collection.fields.addAt(-1, new TextField({
      name: "auth",
      required: true,
      max: 256,
    }));

    // userAgent — optional device identifier (max 500 chars)
    collection.fields.addAt(-1, new TextField({
      name: "userAgent",
      required: false,
      max: 500,
    }));

    app.save(collection);
  },

  // DOWN — delete push_subscriptions collection
  (app) => {
    const collection = app.findCollectionByNameOrId("push_subscriptions");
    app.delete(collection);
  }
);
