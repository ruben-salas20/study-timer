// Migration 003 — Create the "study_sessions" collection
//
// Schema (per ARCHITECTURE.md §4):
//   - user        : relation → users, cascadeDelete: true
//   - mode        : select (pomodoro | stopwatch | countdown), required
//   - startedAt   : datetime, required
//   - endedAt     : datetime, nullable
//   - durationSec : number, required, min 0, default 0
//   - pomodoroConfig: json, nullable
//   - targetSec   : number, nullable, min 0
//   - notes       : text, nullable, max 500
//   - created / updated : auto (PocketBase built-in)
//
// API rules (read = own; create/update/delete = own):
//   listRule / viewRule  : "@request.auth.id != \"\" && user = @request.auth.id"
//   createRule           : same
//   updateRule           : same
//   deleteRule           : same
//
// Reference: ARCHITECTURE.md §4, §6.2 (timer flow), F2 scope.

/// <reference path="../pb_data/types.d.ts" />
migrate(
  // UP — create study_sessions collection
  (app) => {
    const collection = new Collection({
      name: "study_sessions",
      type: "base",
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [],
    });

    // user — relation to users, cascade delete
    collection.fields.addAt(-1, new RelationField({
      name: "user",
      required: true,
      collectionId: app.findCollectionByNameOrId("users").id,
      cascadeDelete: true,
      maxSelect: 1,
    }));

    // mode — select: pomodoro | stopwatch | countdown
    collection.fields.addAt(-1, new SelectField({
      name: "mode",
      required: true,
      maxSelect: 1,
      values: ["pomodoro", "stopwatch", "countdown"],
    }));

    // startedAt — datetime, required
    collection.fields.addAt(-1, new DateField({
      name: "startedAt",
      required: true,
    }));

    // endedAt — datetime, nullable (null while session is active)
    collection.fields.addAt(-1, new DateField({
      name: "endedAt",
      required: false,
    }));

    // durationSec — number, required, min 0
    collection.fields.addAt(-1, new NumberField({
      name: "durationSec",
      required: true,
      min: 0,
    }));

    // pomodoroConfig — json, nullable (holds workMin, breakMin, cycles)
    collection.fields.addAt(-1, new JSONField({
      name: "pomodoroConfig",
      required: false,
    }));

    // targetSec — number, nullable, min 0 (used for countdown mode)
    collection.fields.addAt(-1, new NumberField({
      name: "targetSec",
      required: false,
      min: 0,
    }));

    // notes — text, nullable, max 500
    collection.fields.addAt(-1, new TextField({
      name: "notes",
      required: false,
      max: 500,
    }));

    app.save(collection);
  },

  // DOWN — delete study_sessions collection
  (app) => {
    const collection = app.findCollectionByNameOrId("study_sessions");
    app.delete(collection);
  }
);
