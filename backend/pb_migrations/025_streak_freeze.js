// Migration 025 — Streak freeze fields on the users collection.
//
// Adds three fields that together implement the "2 comodines / mes" rule:
//   - freezeBudget       : number  — comodines remaining this month (default 2)
//   - freezeMonth        : text    — YYYY-MM the budget is anchored to
//   - freezeAppliedDates : json[]  — dates ("YYYY-MM-DD") that were rescued
//                                    by a freeze, accumulated across months
//
// Why three fields:
//   Budget refills on month rollover (detected lazily by comparing freezeMonth
//   to the current YYYY-MM in the session-end hook). Applied dates accumulate
//   indefinitely so historical freezes keep counting toward the streak; only
//   the BUDGET resets each month.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("users");

    if (!collection.fields.getByName("freezeBudget")) {
      collection.fields.addAt(-1, new NumberField({
        name: "freezeBudget",
        required: false,
      }));
    }

    if (!collection.fields.getByName("freezeMonth")) {
      collection.fields.addAt(-1, new TextField({
        name: "freezeMonth",
        required: false,
        max: 7,
      }));
    }

    if (!collection.fields.getByName("freezeAppliedDates")) {
      collection.fields.addAt(-1, new JSONField({
        name: "freezeAppliedDates",
        required: false,
      }));
    }

    app.save(collection);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    for (const f of ["freezeBudget", "freezeMonth", "freezeAppliedDates"]) {
      if (collection.fields.getByName(f)) collection.fields.removeByName(f);
    }
    app.save(collection);
  }
);
