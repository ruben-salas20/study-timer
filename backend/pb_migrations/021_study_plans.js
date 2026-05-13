// Migration 021 — Create the "study_plans" collection
//
// Powers /plan: users can schedule a study block ahead of time. A cron
// dispatches a push 10 minutes before the planned start. Tapping "Iniciar"
// on a plan opens a countdown session pre-filled with the planned subject
// and duration, links the resulting session id back to the plan, and the
// on-session-end hook flips the plan to status=done.
//
// Schema:
//   - user            : relation → users, cascadeDelete: true, required
//   - subject         : relation → subjects, cascadeDelete: false, nullable
//   - plannedAt       : datetime, required (block start)
//   - durationMin     : number, required, min 1, max 600
//   - notes           : text, nullable, max 200
//   - status          : select (upcoming | done), required, default upcoming
//   - notified        : bool, default false (set true once the 10-min push fires)
//   - linkedSessionId : text, nullable (the study_sessions id started from
//                       this plan; lets the on-session-end hook close the loop)
//   - created / updated : auto
//
// Rules: owner-only across the board. Plans are private; no friend visibility.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: "study_plans",
      type: "base",
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [],
    });

    collection.fields.addAt(-1, new RelationField({
      name: "user",
      required: true,
      collectionId: app.findCollectionByNameOrId("users").id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    collection.fields.addAt(-1, new RelationField({
      name: "subject",
      required: false,
      collectionId: app.findCollectionByNameOrId("subjects").id,
      cascadeDelete: false,
      maxSelect: 1,
    }));

    collection.fields.addAt(-1, new DateField({
      name: "plannedAt",
      required: true,
    }));

    collection.fields.addAt(-1, new NumberField({
      name: "durationMin",
      required: true,
      min: 1,
      max: 600,
    }));

    collection.fields.addAt(-1, new TextField({
      name: "notes",
      required: false,
      max: 200,
    }));

    collection.fields.addAt(-1, new SelectField({
      name: "status",
      required: true,
      maxSelect: 1,
      values: ["upcoming", "done"],
    }));

    collection.fields.addAt(-1, new BoolField({
      name: "notified",
      required: false,
    }));

    collection.fields.addAt(-1, new TextField({
      name: "linkedSessionId",
      required: false,
      max: 32,
    }));

    collection.fields.addAt(-1, new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    collection.fields.addAt(-1, new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));

    app.save(collection);

    // Lookups: by user (always filtered) + by plannedAt (cron queries window).
    const fresh = app.findCollectionByNameOrId("study_plans");
    fresh.indexes = [
      "CREATE INDEX idx_study_plans_user ON study_plans (user)",
      "CREATE INDEX idx_study_plans_plannedAt ON study_plans (plannedAt)",
    ];
    app.save(fresh);
  },

  (app) => {
    const collection = app.findCollectionByNameOrId("study_plans");
    app.delete(collection);
  }
);
