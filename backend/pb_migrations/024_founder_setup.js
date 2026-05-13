// Migration 024 — Founder achievement bootstrap
//
// Adds the admin/founder machinery on top of migration 022:
//   1. users.isAdmin   — boolean flag, false by default
//   2. achievements_unlocked.createRule — relaxed from null to require an
//      authenticated admin, so admins (currently just the founder) can
//      hand-grant achievements over the API. Hook-based inserts still go
//      through app.save() which bypasses rules entirely.
//   3. Identify the founder by email, flip isAdmin=true on that user, and
//      create their own "founder" unlock row idempotently.
//
// The "founder" achievement key is intentionally NOT in achievements.pb.js's
// evaluation list — it cannot be earned via session counts or streaks. It's
// only handed out by an admin via the /achievements admin panel.

/// <reference path="../pb_data/types.d.ts" />

const FOUNDER_EMAIL = "rubensalas0907@gmail.com";

migrate(
  (app) => {
    // ── 1. Add isAdmin to users ────────────────────────────────────────
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("isAdmin")) {
      users.fields.addAt(-1, new BoolField({
        name: "isAdmin",
        required: false,
      }));
      app.save(users);
    }

    // ── 2. Relax achievements_unlocked.createRule to admin-only ─────────
    const ach = app.findCollectionByNameOrId("achievements_unlocked");
    ach.createRule = '@request.auth.id != "" && @request.auth.isAdmin = true';
    app.save(ach);

    // ── 3. Bootstrap the founder ───────────────────────────────────────
    let founder;
    try {
      founder = app.findFirstRecordByFilter(
        "users",
        `email = "${FOUNDER_EMAIL}"`
      );
    } catch (_) {
      console.warn(`[mig 024] Founder user (${FOUNDER_EMAIL}) not found in this DB — skipping admin flag + unlock. Will apply on next migrate after that user exists.`);
      return;
    }

    if (!founder.get("isAdmin")) {
      founder.set("isAdmin", true);
      app.save(founder);
    }

    // Idempotent unlock — skip if already present (race with manual grant)
    let alreadyHas = false;
    try {
      app.findFirstRecordByFilter(
        "achievements_unlocked",
        `user = "${founder.id}" && key = "founder"`
      );
      alreadyHas = true;
    } catch (_) {
      // not found — will create below
    }

    if (!alreadyHas) {
      const rec = new Record(ach);
      rec.set("user", founder.id);
      rec.set("key", "founder");
      rec.set("unlockedAt", new Date().toISOString());
      app.save(rec);
    }
  },

  (app) => {
    // Down — remove isAdmin field and restore null createRule.
    // Founder unlock rows stay (they're harmless data; the registry still
    // recognises them).
    const users = app.findCollectionByNameOrId("users");
    if (users.fields.getByName("isAdmin")) {
      users.fields.removeByName("isAdmin");
      app.save(users);
    }
    const ach = app.findCollectionByNameOrId("achievements_unlocked");
    ach.createRule = null;
    app.save(ach);
  }
);
