// Migration 013 — Relax challenge_participants API rules
//
// Bug: The original createRule was 'user = @request.auth.id' (only join
// yourself). But the frontend createChallenge flow has the CREATOR add
// invited friends as participants — that gets blocked by this rule and
// fails the whole challenge creation.
//
// New rules:
//   listRule / viewRule:  any authenticated user (frontend filters by id)
//   createRule:           self OR you are the challenge creator (can invite)
//   updateRule:           self only — nobody else mutates your progress
//   deleteRule:           self OR challenge creator (creator can remove)

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("challenge_participants");

    const authed = '@request.auth.id != ""';
    const selfOrCreator =
      '@request.auth.id != "" && (user = @request.auth.id || challenge.createdBy = @request.auth.id)';

    collection.listRule = authed;
    collection.viewRule = authed;
    collection.createRule = selfOrCreator;
    collection.updateRule = '@request.auth.id != "" && user = @request.auth.id';
    collection.deleteRule = selfOrCreator;

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("challenge_participants");
    const original =
      '@request.auth.id != "" && (user = @request.auth.id || challenge.createdBy = @request.auth.id || @collection.challenge_participants.user ?= @request.auth.id && @collection.challenge_participants.challenge ?= challenge)';
    collection.listRule = original;
    collection.viewRule = original;
    collection.createRule = '@request.auth.id != "" && user = @request.auth.id';
    collection.updateRule = '@request.auth.id != "" && user = @request.auth.id';
    collection.deleteRule = '@request.auth.id != "" && user = @request.auth.id';
    app.save(collection);
  }
);
