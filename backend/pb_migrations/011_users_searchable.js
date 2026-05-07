// Migration 011 — Allow authenticated users to find each other by friendCode
//
// Why: the default users collection has listRule/viewRule restricted to
// `id = @request.auth.id`, which means a logged-in user can ONLY see their
// own record. The "add friend by code" flow needs to look up another user
// by friendCode — that returns 404 under the strict default rule.
//
// New rules: any authenticated user can list/view users. Email stays hidden
// via the auth collection's emailVisibility=false default for non-owners.
// Sensitive fields (email, password) are protected by PB's built-in auth
// field handling. Profile fields (displayName, friendCode, avatar) become
// visible to all authenticated users — acceptable for a friends-only app.
//
// Reference: F3 friends scope.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — relax listRule/viewRule
  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    collection.listRule = '@request.auth.id != ""';
    collection.viewRule = '@request.auth.id != ""';
    app.save(collection);
  },

  // DOWN — restore original strict rules
  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    collection.listRule = "id = @request.auth.id";
    collection.viewRule = "id = @request.auth.id";
    app.save(collection);
  }
);
