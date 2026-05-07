// Migration 004 — Create the "friendships" collection
//
// Schema (per ARCHITECTURE.md §4):
//   - userA        : relation → users (cascade)
//   - userB        : relation → users (cascade)
//   - status       : select (pending | accepted | blocked), required
//   - requestedBy  : relation → users
//   - created / updated : auto (PocketBase built-in)
//
// Uniqueness of the (userA, userB) pair is enforced in the
// on-friendship-create.js hook because PocketBase 0.23 does not support
// native composite unique constraints on relation fields.
// The hook normalises the pair to userA < userB lexicographically so that
// only one record can exist regardless of request direction.
//
// API rules:
//   listRule / viewRule : auth user is in the pair
//   createRule          : auth user is requestedBy AND is in the pair
//   updateRule          : auth user is in the pair (accept / reject)
//   deleteRule          : auth user is in the pair (remove)
//
// Reference: ARCHITECTURE.md §4, F3 scope.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — create friendships collection
  (app) => {
    const usersCollection = app.findCollectionByNameOrId("users");

    const collection = new Collection({
      name: "friendships",
      type: "base",
      listRule: '@request.auth.id != "" && (userA = @request.auth.id || userB = @request.auth.id)',
      viewRule: '@request.auth.id != "" && (userA = @request.auth.id || userB = @request.auth.id)',
      createRule: '@request.auth.id != "" && requestedBy = @request.auth.id && (userA = @request.auth.id || userB = @request.auth.id)',
      updateRule: '@request.auth.id != "" && (userA = @request.auth.id || userB = @request.auth.id)',
      deleteRule: '@request.auth.id != "" && (userA = @request.auth.id || userB = @request.auth.id)',
      fields: [],
    });

    // userA — relation to users, cascade delete
    collection.fields.addAt(-1, new RelationField({
      name: "userA",
      required: true,
      collectionId: usersCollection.id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    // userB — relation to users, cascade delete
    collection.fields.addAt(-1, new RelationField({
      name: "userB",
      required: true,
      collectionId: usersCollection.id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    // status — select: pending | accepted | blocked
    collection.fields.addAt(-1, new SelectField({
      name: "status",
      required: true,
      maxSelect: 1,
      values: ["pending", "accepted", "blocked"],
    }));

    // requestedBy — relation to users (who sent the request)
    collection.fields.addAt(-1, new RelationField({
      name: "requestedBy",
      required: true,
      collectionId: usersCollection.id,
      cascadeDelete: false,
      maxSelect: 1,
    }));

    app.save(collection);
  },

  // DOWN — delete friendships collection
  (app) => {
    const collection = app.findCollectionByNameOrId("friendships");
    app.delete(collection);
  }
);
