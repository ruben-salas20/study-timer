// Migration 006 — Create the "challenges" collection
//
// Schema (per ARCHITECTURE.md §4 and F4 scope):
//   - createdBy     : relation → users (cascade)
//   - type          : select (race | weekly_goal | duel | group_streak)
//   - title         : text required min 3 max 80
//   - description   : text nullable max 500
//   - startsAt      : datetime required
//   - endsAt        : datetime required
//   - targetSec     : number nullable min 60 (race, weekly_goal, duel)
//   - targetDays    : number nullable min 1 max 90 (group_streak only)
//   - prizeWinner   : text required max 200
//   - prizeLoser    : text nullable max 200
//   - status        : select (pending | active | completed | cancelled) default pending
//
// API rules:
//   listRule / viewRule  : participant OR creator
//   createRule           : authenticated AND createdBy = auth id
//   updateRule           : creator AND status=pending AND startsAt > now
//   deleteRule           : same as update
//
// Reference: ARCHITECTURE.md §4, F4 scope.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — create challenges collection
  (app) => {
    const usersCollection = app.findCollectionByNameOrId("users");

    const collection = new Collection({
      name: "challenges",
      type: "base",
      listRule: '@request.auth.id != "" && (createdBy = @request.auth.id || @collection.challenge_participants.challenge ?= id && @collection.challenge_participants.user ?= @request.auth.id)',
      viewRule: '@request.auth.id != "" && (createdBy = @request.auth.id || @collection.challenge_participants.challenge ?= id && @collection.challenge_participants.user ?= @request.auth.id)',
      createRule: '@request.auth.id != "" && createdBy = @request.auth.id',
      updateRule: '@request.auth.id != "" && createdBy = @request.auth.id && status = "pending"',
      deleteRule: '@request.auth.id != "" && createdBy = @request.auth.id && status = "pending"',
      fields: [],
    });

    // createdBy — relation to users, cascade delete
    collection.fields.addAt(-1, new RelationField({
      name: "createdBy",
      required: true,
      collectionId: usersCollection.id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    // type — select: race | weekly_goal | duel | group_streak
    collection.fields.addAt(-1, new SelectField({
      name: "type",
      required: true,
      maxSelect: 1,
      values: ["race", "weekly_goal", "duel", "group_streak"],
    }));

    // title — text min 3 max 80
    collection.fields.addAt(-1, new TextField({
      name: "title",
      required: true,
      min: 3,
      max: 80,
    }));

    // description — text optional max 500
    collection.fields.addAt(-1, new TextField({
      name: "description",
      required: false,
      max: 500,
    }));

    // startsAt — datetime required
    collection.fields.addAt(-1, new DateField({
      name: "startsAt",
      required: true,
    }));

    // endsAt — datetime required
    collection.fields.addAt(-1, new DateField({
      name: "endsAt",
      required: true,
    }));

    // targetSec — number nullable min 60 (race / weekly_goal / duel)
    collection.fields.addAt(-1, new NumberField({
      name: "targetSec",
      required: false,
      min: 60,
    }));

    // targetDays — number nullable min 1 max 90 (group_streak only)
    collection.fields.addAt(-1, new NumberField({
      name: "targetDays",
      required: false,
      min: 1,
      max: 90,
    }));

    // prizeWinner — text required max 200
    collection.fields.addAt(-1, new TextField({
      name: "prizeWinner",
      required: true,
      max: 200,
    }));

    // prizeLoser — text optional max 200
    collection.fields.addAt(-1, new TextField({
      name: "prizeLoser",
      required: false,
      max: 200,
    }));

    // status — select: pending | active | completed | cancelled (default pending)
    collection.fields.addAt(-1, new SelectField({
      name: "status",
      required: true,
      maxSelect: 1,
      values: ["pending", "active", "completed", "cancelled"],
    }));

    app.save(collection);
  },

  // DOWN — delete challenges collection
  (app) => {
    const collection = app.findCollectionByNameOrId("challenges");
    app.delete(collection);
  }
);
