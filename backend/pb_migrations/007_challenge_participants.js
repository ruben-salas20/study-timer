// Migration 007 — Create the "challenge_participants" collection
//
// Schema (per ARCHITECTURE.md §4 and F4 scope):
//   - challenge     : relation → challenges (cascade)
//   - user          : relation → users (cascade)
//   - joinedAt      : datetime required
//   - progressSec   : number default 0 min 0
//   - streakDays    : number default 0 min 0 (computed on-demand for group_streak)
//   - created/updated: auto (PocketBase built-in)
//
// API rules:
//   listRule / viewRule : auth user is in the challenge (participant or creator)
//   createRule          : authenticated AND user = auth id (join yourself only)
//   updateRule          : authenticated AND user = auth id
//   deleteRule          : authenticated AND user = auth id
//
// Note: streakDays is stored but for F4 it is computed on-demand from
//       session history in frontend selectors (no hook mutation). This avoids
//       race conditions in the session-end hook. See F4 scope in ARCHITECTURE.md.
//
// Reference: ARCHITECTURE.md §4, F4 scope.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — create challenge_participants collection
  (app) => {
    const usersCollection = app.findCollectionByNameOrId("users");
    const challengesCollection = app.findCollectionByNameOrId("challenges");

    const collection = new Collection({
      name: "challenge_participants",
      type: "base",
      listRule: '@request.auth.id != "" && (user = @request.auth.id || challenge.createdBy = @request.auth.id || @collection.challenge_participants.user ?= @request.auth.id && @collection.challenge_participants.challenge ?= challenge)',
      viewRule: '@request.auth.id != "" && (user = @request.auth.id || challenge.createdBy = @request.auth.id || @collection.challenge_participants.user ?= @request.auth.id && @collection.challenge_participants.challenge ?= challenge)',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [],
    });

    // challenge — relation to challenges, cascade delete
    collection.fields.addAt(-1, new RelationField({
      name: "challenge",
      required: true,
      collectionId: challengesCollection.id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    // user — relation to users, cascade delete
    collection.fields.addAt(-1, new RelationField({
      name: "user",
      required: true,
      collectionId: usersCollection.id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    // joinedAt — datetime required
    collection.fields.addAt(-1, new DateField({
      name: "joinedAt",
      required: true,
    }));

    // progressSec — number default 0 min 0
    collection.fields.addAt(-1, new NumberField({
      name: "progressSec",
      required: false,
      min: 0,
    }));

    // streakDays — number default 0 min 0
    // For F4: stored but computed on-demand in frontend; not mutated by hooks.
    collection.fields.addAt(-1, new NumberField({
      name: "streakDays",
      required: false,
      min: 0,
    }));

    app.save(collection);
  },

  // DOWN — delete challenge_participants collection
  (app) => {
    const collection = app.findCollectionByNameOrId("challenge_participants");
    app.delete(collection);
  }
);
