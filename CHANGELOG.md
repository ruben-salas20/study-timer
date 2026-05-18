# Changelog

All notable changes to Study Timer are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.5.13] — 2026-05-18

### Changed
- Group streak is a cooperative challenge: the create wizard now labels the
  prize "Premio del grupo" and hides the loser-penalty field, and the challenge
  detail screen shows the prize as the group's. The streak-goal-vs-window check
  now also runs inline in the wizard (step 2), not only at submit.

## [0.5.12] — 2026-05-18

### Fixed
- Group streak challenges now display the server-computed `streakDays` (longest
  consecutive run inside the challenge window) instead of a frontend recount that
  summed all common days ever — including days before the challenge started.

### Changed
- Creating a group streak challenge now rejects a `targetDays` goal larger than
  the challenge window, since such a goal is unreachable by design.

## [0.5.11] — 2026-05-18

### Added
- Three new preset cuy avatars: Ingeniero Ambiental, Marketing, Nutricionista

## [0.1.0] — 2026-05-07

### F8 — Final Polish

**Active session rehydration**
- Timer state now restores from localStorage on page reload (F2 carry-over)
- Verifies the session is still active on PocketBase before restoring
- Stale entries (ended sessions) are cleaned up silently

**Group streak computation**
- `ChallengeDetailPage` for type=group_streak now fetches real session data for all participants
- `useChallengeParticipantSessions` hook aggregates sessions per user into UTC day strings
- `computeGroupStreakState` receives live data and computes the real consecutive streak

**Real PWA icons**
- SVG-based icons generated via `scripts/generate-icons.mjs` (Node, no sharp required)
- `icon-192x192.svg`, `icon-512x512.svg`, `icon-maskable-512.svg`, `apple-touch-icon.svg`
- Manifest updated with separate maskable icon entry (`purpose: "maskable"`)
- `pnpm gen:icons` script added to `frontend/package.json`

**UI primitives**
- `EmptyState` component — icon, title, description, optional action
- `Skeleton` component — pulsing placeholder for loading states
- `Toast` + `useToast` hook — auto-dismiss queue (4s), top-right, slide-in animation
- `ConfirmDialog` — accessible modal with focus trap, Escape to cancel
- `ErrorBoundary` — class component wrapping the full route tree

**Empty and loading states wired**
- FriendsPage: skeleton rows + EmptyState ("Aún no tenés amigos")
- ChallengesPage: skeleton cards + EmptyState ("No hay retos activos. Creá uno")
- StatsPage: skeleton hero + tiles (loading), EmptyState preserved
- ChallengeDetailPage: ConfirmDialog on leave / cancel challenge
- SettingsPage: ConfirmDialog on logout

**Microinteractions**
- Page transitions: 100ms fade-in on route change (`page-enter` CSS keyframe)
- Button press: `scale(0.95)` active state via CSS transition
- Toast: slide-in from right (`animate-slide-in-right` keyframe)
- Mode card hover: `mode-card` class with shadow lift
- Pomodoro phase change: `phase-pulse` CSS animation available
- Timer digits: `tabular-nums` via `.timer-digits` class

**Accessibility**
- Global `:focus-visible` ring using `--color-primary` CSS var
- Non-keyboard focus outline removed (`outline: none` for `:focus:not(:focus-visible)`)
- All new interactive elements include `aria-label`, `role`, or text content
- `aria-live="polite"` on ToastContainer region

---

## [0.0.0] — 2026-04-xx

### F0–F7 — Foundation through Production Deploy

| Phase | What was built |
|-------|---------------|
| F0 | Repo scaffold, Vite + React 19 + TS, Tailwind v4, PocketBase Docker, dev compose |
| F1 | Auth (registration, login), friendCode, theme/accent palettes, onboarding flow |
| F2 | 3 timer modes (stopwatch, countdown, pomodoro), PocketBase session recording, pause/resume |
| F3 | Friends by code, weekly ranking, accept/reject requests, remove |
| F4 | 4 challenge types (race, weekly_goal, duel, group_streak), live progress, cron |
| F5 | Stats aggregation, streak hero, day bar chart, mode breakdown, profile, settings |
| F6 | PWA manifest, Workbox service worker (injectManifest), VAPID Web Push notifications |
| F7 | VPS deployment (Hostinger), Caddy HTTPS, Docker Compose prod, backup scripts |
