// Migration 005 — Extend study_sessions listRule for friends visibility
//
// Problem: study_sessions currently only allows the owner to list/view
// their own sessions. For the weekly ranking feature, accepted friends
// need to read each other's sessions to aggregate totals.
//
// PocketBase 0.23 nested @collection filter capability note:
//   PB 0.23 does support @collection.<name>.<field> in filter rules but
//   the cross-collection back-reference syntax for listRule is limited.
//   After testing, the recommended approach for bi-directional friendship
//   checks is to keep the rule focused on the two friendship fields:
//
//     @collection.friendships.status = "accepted" && (
//       (@collection.friendships.userA = user && @collection.friendships.userB = @request.auth.id) ||
//       (@collection.friendships.userB = user && @collection.friendships.userA = @request.auth.id)
//     )
//
//   This translates to: "there exists an accepted friendship record where
//   one party is the session owner (user) and the other is the requester."
//
//   If PocketBase rule evaluation does not short-circuit per record, the
//   client-side fallback is: fetch friends list first, then query sessions
//   filtered by userId IN [friendIds]. Both paths are handled in the
//   frontend useWeeklyRanking hook (two-query approach as documented
//   in ARCHITECTURE.md deviation note).
//
// NEW listRule (viewRule updated to match):
//   owner OR accepted friend of owner
//
// Reference: ARCHITECTURE.md §4, F3 scope — sessions_friends_visibility.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — extend listRule / viewRule to allow accepted friends to read sessions
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");

    // Allow: own sessions OR sessions of accepted friends
    // The nested @collection lookup checks the friendships table bidirectionally.
    const friendsRule = [
      '@request.auth.id != "" && (',
      '  user = @request.auth.id ||',
      '  @collection.friendships.status = "accepted" && (',
      '    (@collection.friendships.userA = user && @collection.friendships.userB = @request.auth.id) ||',
      '    (@collection.friendships.userB = user && @collection.friendships.userA = @request.auth.id)',
      '  )',
      ')',
    ].join('\n');

    collection.listRule = friendsRule;
    collection.viewRule = friendsRule;

    app.save(collection);
  },

  // DOWN — revert to owner-only rules
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    const ownerOnly = '@request.auth.id != "" && user = @request.auth.id';
    collection.listRule = ownerOnly;
    collection.viewRule = ownerOnly;
    app.save(collection);
  }
);
