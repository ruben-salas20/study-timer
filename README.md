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

## Deploy a producción

### Prerequisites

- VPS with Ubuntu 22.04 LTS (Hostinger or equivalent)
- A subdomain or custom domain with an **A record pointing to the VPS IP**
- SSH access to the VPS

### Step-by-step

#### 1. Bootstrap the VPS (run once)

SSH into your VPS and run the bootstrap script. It installs Docker, clones the
repo, and prepares the environment:

```bash
# On the VPS:
wget -qO - https://raw.githubusercontent.com/ruben-salas20/study-timer/main/scripts/vps-bootstrap.sh | bash
```

Or clone manually and run it:

```bash
git clone https://github.com/ruben-salas20/study-timer.git ~/study-timer
chmod +x ~/study-timer/scripts/*.sh
~/study-timer/scripts/vps-bootstrap.sh
```

After the script finishes, **log out and back in** so the docker group applies.

#### 2. Generate VAPID keys

```bash
docker run --rm node:20-alpine sh -c 'npx --yes web-push generate-vapid-keys'
```

Note down the **Public Key** and **Private Key**.

#### 3. Edit `.env`

```bash
cd ~/study-timer
nano .env
```

Set these values (minimum required for production):

| Variable | Example | Notes |
|----------|---------|-------|
| `DOMAIN` | `timer.yourdomain.com` | Must match the DNS A record |
| `VAPID_PUBLIC_KEY` | `BExamplePublicKey...` | From step 2 |
| `VAPID_PRIVATE_KEY` | `secret...` | From step 2 — never share |
| `VAPID_SUBJECT` | `mailto:you@example.com` | Your email or app URL |
| `VITE_VAPID_PUBLIC_KEY` | same as `VAPID_PUBLIC_KEY` | Used at frontend build time |
| `PUSH_SERVICE_TOKEN` | `openssl rand -hex 32` | Shared secret, any random 32-byte hex |

#### 4. Deploy

```bash
cd ~/study-timer
./scripts/deploy.sh
```

The script:
1. Validates `.env` has all required vars
2. Pulls the latest code from `origin/main`
3. Builds all Docker images (frontend multi-stage build + PocketBase + push-service)
4. Starts containers with `docker compose -f docker-compose.prod.yml up -d`
5. Tails Caddy logs to confirm TLS certificate acquisition

> First deploy: Caddy requests a Let's Encrypt TLS certificate. This can take
> 30–60 seconds. If you see a TLS error immediately after deploy, wait one minute
> and refresh.

#### 5. Create the PocketBase admin account

Open `https://your-domain/_/` in a browser and create the first admin account.

Then generate a PocketBase API token under **Settings → API tokens** and add it
to `.env` as `POCKETBASE_ADMIN_TOKEN`. Re-run `./scripts/deploy.sh` to apply.

#### 6. Set up automatic backups (optional but recommended)

The backup script creates daily tarballs of `pb_data` and retains 14 days:

```bash
crontab -e
# Add this line (adjust the path if your repo is not at ~/study-timer):
0 3 * * * /home/USER/study-timer/scripts/backup.sh >> /home/USER/study-timer/logs/backup.log 2>&1
```

### Re-deploying after code changes

```bash
cd ~/study-timer
./scripts/deploy.sh
```

The deploy script always pulls latest code and rebuilds images.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| TLS error after first deploy | Cert not yet issued | Wait 60 s and refresh |
| `Permission denied` running docker | docker group not active | Log out and back in |
| `.env` validation fails | Missing required var | Check error output and edit `.env` |
| PocketBase not accessible | Container not started | `docker compose -f docker-compose.prod.yml ps` |
| Push notifications not delivered | VAPID mismatch or token wrong | Check `VITE_VAPID_PUBLIC_KEY` matches `VAPID_PUBLIC_KEY` |

### Scripts reference

| Script | When to run | What it does |
|--------|-------------|--------------|
| `scripts/vps-bootstrap.sh` | Once on fresh VPS | Installs Docker, clones repo, creates `.env` |
| `scripts/deploy.sh` | Every deploy | Pulls, builds, restarts containers |
| `scripts/backup.sh` | Via cron daily | Tarballs `pb_data`, retains last 14 days |

> After cloning on a new machine, make scripts executable:
> `chmod +x scripts/*.sh`

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
| **F0 — Foundation** | Repo scaffold, Vite + React + TS, Tailwind v4, PocketBase Docker, dev compose | Done |
| **F1 — Auth + onboarding** | Registration, login, friendCode, theme/accent | Done |
| **F2 — Timer + sessions** | 3 timer modes, persistence, history | Done |
| **F3 — Friends** | Add by code, list, accept | Done |
| **F4 — Challenges** | 4 types, live progress | Done |
| **F5 — Stats + profile** | Aggregated stats, settings | Done |
| **F6 — PWA + push** | Manifest, service worker, VAPID notifications | Done |
| **F7 — Production deploy** | VPS, Caddy, domain, backups | Done |
| **F8 — Polish** | Active session rehydration, group streak, real PWA icons, UI primitives (EmptyState, Skeleton, Toast, ConfirmDialog, ErrorBoundary), microinteractions, accessibility audit | Done |

See [ARCHITECTURE.md §9](./ARCHITECTURE.md) for the full roadmap and per-phase delivery criteria.
