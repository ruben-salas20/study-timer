// Migration 012 — Simplify study_sessions API rules
//
// Why: PocketBase 0.23 cross-collection @collection.* rule chains do not
// reliably enforce composite conditions per-record. The friend-visibility
// rule from migration 005 silently fails: even accepted friends cannot
// read each other's sessions, breaking the weekly ranking and challenge
// progress features.
//
// Pragmatic solution for a friends-only app at this scale:
//   - listRule / viewRule: any authenticated user can list/view sessions
//   - The frontend always filters by specific userId, so this is not a UX
//     leak — but it does mean a malicious authenticated user could dump
//     all sessions. For the closed friend group this targets, that risk
//     is acceptable.
//   - createRule / updateRule / deleteRule: still owner-only — nobody
//     can mutate someone else's session data.
//
// Reference: F3/F4 visibility, supersedes migration 005.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    const authed = '@request.auth.id != ""';
    const ownerOnly = '@request.auth.id != "" && user = @request.auth.id';

    collection.listRule = authed;
    collection.viewRule = authed;
    collection.createRule = ownerOnly;
    collection.updateRule = ownerOnly;
    collection.deleteRule = ownerOnly;

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    const ownerOnly = '@request.auth.id != "" && user = @request.auth.id';
    collection.listRule = ownerOnly;
    collection.viewRule = ownerOnly;
    app.save(collection);
  }
);
