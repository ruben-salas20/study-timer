// Migration 001 — Extend the built-in auth "users" collection
//
// What this WILL do in F1:
//   - Add `displayName` (plain text)
//   - Add `avatarUrl` (URL text, nullable)
//   - Add `friendCode` (6-char unique string, auto-generated server-side)
//   - Add `weeklyGoalMinutes` (number, default 600 = 10 h)
//   - Add `timezone` (IANA string, default "America/Argentina/Buenos_Aires")
//   - Add `theme` (select: auto | light | dark, default "auto")
//   - Add `accentColor` (select: sage | blue | warm | mono, default "sage")
//
// See ARCHITECTURE.md §4 for the full field definitions.
// This file is a stub — real field additions happen in F1.

migrate(
  (db) => {
    // TODO: F1 — extend users auth collection with profile fields
  },
  (db) => {
    // TODO: F1 — down: remove extended profile fields from users
  }
);
