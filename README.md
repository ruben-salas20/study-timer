# Study Timer

> A competitive study timer PWA for a closed group of friends. Track sessions, add friends by code, and compete in challenges — self-hosted, zero vendor lock-in.

![CI](https://github.com/your-username/study-timer/actions/workflows/ci.yml/badge.svg)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19 + TypeScript |
| PWA | vite-plugin-pwa (Workbox, generateSW) |
| Styles | Tailwind CSS v4 (`@theme` in CSS, no config file) |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Routing | React Router 6 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Backend | PocketBase 0.23.4 (auth, DB, realtime, storage) |
| Reverse proxy | Caddy 2 (HTTPS auto-cert via Let's Encrypt) |
| Container | Docker Compose |
| CI | GitHub Actions |

For the full architecture rationale, data model, and design decisions see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Quickstart

### Prerequisites

- [Node 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- [Docker](https://www.docker.com/get-started/) with Compose v2

### 1. Install frontend dependencies

```bash
cd frontend
pnpm install
```

### 2. Start the backend (PocketBase)

```bash
# from the repo root
docker compose up -d
```

PocketBase starts on `http://localhost:8090`.
Admin UI: `http://localhost:8090/_/`

### 3. Start the frontend dev server

```bash
cd frontend
pnpm dev
```

App is available at `http://localhost:5173`.
The Vite dev server proxies `/api/*` and `/_/*` to PocketBase automatically.

### 4. Configure environment (optional)

Copy the example and fill in values:

```bash
cp .env.example .env
```

`VITE_PB_URL` defaults to `http://localhost:8090` if not set — no `.env` file needed for local dev.

---

## Project structure

```
study-timer/
├── ARCHITECTURE.md          # design decisions and data model (read this)
├── README.md
├── .env.example
├── docker-compose.yml       # dev: PocketBase only
├── docker-compose.prod.yml  # prod: Caddy + PocketBase
├── Caddyfile                # production reverse proxy config
│
├── backend/
│   ├── Dockerfile           # PocketBase 0.23.4 on Alpine
│   ├── pb_migrations/       # versioned JS migrations (001–006)
│   ├── pb_hooks/            # server-side JS hooks (F1+)
│   └── push-service/        # Node Web Push microservice (F6, stub)
│
├── frontend/
│   ├── vite.config.ts
│   ├── src/
│   │   ├── app/             # App, routes, providers
│   │   ├── features/        # screaming architecture (auth, timer, friends…)
│   │   ├── shared/          # pb.ts, ui/, hooks/, lib/, types/
│   │   └── pwa/             # SW registration, push, install prompt
│   └── public/icons/
│
└── .github/workflows/
    └── ci.yml               # runs pnpm test on push and PR
```

---

## Common commands

Run these from the `frontend/` directory unless noted otherwise.

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm test` | Run Vitest in watch mode |
| `pnpm test --run` | Run Vitest once (CI mode) |
| `pnpm lint` | ESLint check |
| `pnpm gen:types` | Generate TypeScript types from PocketBase schema (requires running PB + pb_data/data.db) |
| `docker compose up -d` | Start PocketBase in background (repo root) |
| `docker compose logs -f` | Tail PocketBase logs (repo root) |
| `docker compose -f docker-compose.prod.yml up -d` | Start full production stack (repo root) |

---

## Phase plan

| Phase | Scope | Status |
|-------|-------|--------|
| **F0 — Foundation** | Repo scaffold, Vite + React + TS, Tailwind v4, PocketBase Docker, dev compose | In progress |
| **F1 — Auth + onboarding** | Registration, login, friendCode, theme/accent | Pending |
| **F2 — Timer + sessions** | 3 timer modes, persistence, history | Pending |
| **F3 — Friends** | Add by code, list, accept | Pending |
| **F4 — Challenges** | 4 types, live progress | Pending |
| **F5 — Stats + profile** | Aggregated stats, settings | Pending |
| **F6 — PWA + push** | Manifest, service worker, VAPID notifications | Pending |
| **F7 — Production deploy** | VPS, Caddy, domain, backups | Pending |
| **F8 — Polish** | Micro-interactions, empty/error states, animations | Pending |

See [ARCHITECTURE.md §9](./ARCHITECTURE.md) for the full roadmap and per-phase delivery criteria.
