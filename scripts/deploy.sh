#!/usr/bin/env bash
# deploy.sh — Deploy or update Study Timer on the VPS
#
# Run this from the repository root on the VPS:
#   ./scripts/deploy.sh
#
# What it does:
#   1. Validates environment (non-root, Docker available, .env exists with required vars)
#   2. Pulls latest code from origin/main
#   3. Builds all Docker images (frontend multi-stage build happens here)
#   4. Starts/restarts containers in detached mode
#   5. Tails Caddy logs briefly to confirm TLS certificate acquisition
#
# Prerequisites:
#   - Docker Engine installed (run vps-bootstrap.sh first)
#   - User is in the docker group (or run with sudo)
#   - .env file exists at repo root with all required vars
#   - DNS A record for $DOMAIN points to this VPS's IP
#   - Ports 80 and 443 open on the firewall

set -euo pipefail

# ── Color helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()    { echo -e "${YELLOW}[deploy]${NC} $*"; }
error()   { echo -e "${RED}[deploy ERROR]${NC} $*" >&2; }
step()    { echo -e "${BLUE}[deploy]${NC} $*"; }

# ── Resolve repo root (works whether called from repo root or scripts/) ───────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE="docker-compose.prod.yml"

# ── Step 1: Safety checks ─────────────────────────────────────────────────────
step "1/5  Running pre-flight checks..."

if [ "$(id -u)" -eq 0 ]; then
    error "Do not run as root. Run as the deploy user (member of the docker group)."
    exit 1
fi

if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Run scripts/vps-bootstrap.sh first."
    exit 1
fi

if ! docker info &>/dev/null; then
    error "Cannot connect to Docker daemon. Are you in the docker group?"
    error "Run: sudo usermod -aG docker \$USER  then log out and back in."
    exit 1
fi

if [ ! -f ".env" ]; then
    error ".env file not found at $REPO_ROOT/.env"
    error "Copy .env.example to .env and fill in your values."
    exit 1
fi

# Load .env for validation (do NOT export — just source for the check)
# shellcheck disable=SC1091
set -a; source .env; set +a

MISSING_VARS=()
for var in DOMAIN VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT VITE_VAPID_PUBLIC_KEY PUSH_SERVICE_TOKEN; do
    if [ -z "${!var:-}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    error "Required variables missing from .env:"
    for v in "${MISSING_VARS[@]}"; do
        error "  - $v"
    done
    error "Edit .env and set all required variables, then re-run deploy.sh"
    exit 1
fi

info "Pre-flight checks passed. Deploying to: https://$DOMAIN"

# ── Step 2: Pull latest code ──────────────────────────────────────────────────
step "2/5  Pulling latest code from origin/main..."
git pull origin main

# ── Step 3: Build images ──────────────────────────────────────────────────────
step "3/5  Building Docker images (frontend build may take ~2 min on first run)..."
docker compose -f "$COMPOSE_FILE" build

# ── Step 4: Start / restart containers ───────────────────────────────────────
step "4/5  Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

# ── Step 5: Verify and show status ───────────────────────────────────────────
step "5/5  Waiting for containers to stabilise (10 s)..."
sleep 10

# Show running containers
docker compose -f "$COMPOSE_FILE" ps

echo ""
info "Tailing Caddy logs for 15 s (look for 'certificate obtained' or 'serving')..."
timeout 15 docker compose -f "$COMPOSE_FILE" logs --tail=50 web 2>/dev/null || true

echo ""
echo "────────────────────────────────────────────────────────────────"
echo -e "${GREEN}  Deployed at: https://$DOMAIN${NC}"
echo "  PocketBase admin: https://$DOMAIN/_/"
echo "  Health check:     https://$DOMAIN/api/health"
echo "  Push service:     https://$DOMAIN/push/health"
echo "────────────────────────────────────────────────────────────────"
echo ""
warn "First deploy: TLS certificate acquisition may take 30–60 s."
warn "If the site shows a TLS error immediately, wait a minute and refresh."
echo ""
info "To tail all logs: docker compose -f $COMPOSE_FILE logs -f"
info "To stop:          docker compose -f $COMPOSE_FILE down"
