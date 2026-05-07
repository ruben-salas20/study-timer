// Migration 009 — Tighten challenges API rules to include participant visibility
//
// Why this migration exists:
//   Migration 006 creates `challenges` with creator-only listRule/viewRule because
//   the proper rule references @collection.challenge_participants which doesn't
//   exist until migration 007. This migration runs AFTER both collections exist
//   and updates the rules to allow participants (not just creators) to list/view
//   the challenges they're invited to.
//
// Reference: ARCHITECTURE.md §4, F4 scope.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — tighten the rules
  (app) => {
    const collection = app.findCollectionByNameOrId("challenges");

    const participantClause = '@collection.challenge_participants.challenge ?= id && @collection.challenge_participants.user ?= @request.auth.id';

    collection.listRule = `@request.auth.id != "" && (createdBy = @request.auth.id || (${participantClause}))`;
    collection.viewRule = `@request.auth.id != "" && (createdBy = @request.auth.id || (${participantClause}))`;

    app.save(collection);
  },

  // DOWN — revert to creator-only
  (app) => {
    const collection = app.findCollectionByNameOrId("challenges");
    collection.listRule = '@request.auth.id != "" && createdBy = @request.auth.id';
    collection.viewRule = '@request.auth.id != "" && createdBy = @request.auth.id';
    app.save(collection);
  }
);
