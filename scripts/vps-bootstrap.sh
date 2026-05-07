#!/usr/bin/env bash
# vps-bootstrap.sh — One-time VPS setup for Study Timer
#
# Run this on a fresh Ubuntu 22.04 LTS VPS to install Docker, clone the repo,
# and prepare the deployment environment.
#
# Usage:
#   bash vps-bootstrap.sh [clone-dir]
#   Default clone dir: ~/study-timer
#
# What it does:
#   1. Updates apt and installs git
#   2. Installs Docker Engine via the official get.docker.com script
#   3. Adds the current user to the docker group (re-login required)
#   4. Clones the study-timer repository
#   5. Copies .env.example to .env and prints next steps
#
# After running this script:
#   - Log out and back in (or run: newgrp docker) for the docker group to apply
#   - Edit .env with your DOMAIN, VAPID keys, and PUSH_SERVICE_TOKEN
#   - Run: chmod +x scripts/*.sh && ./scripts/deploy.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ruben-salas20/study-timer.git}"
CLONE_DIR="${1:-$HOME/study-timer}"

# ── Color helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warn()    { echo -e "${YELLOW}[bootstrap]${NC} $*"; }
error()   { echo -e "${RED}[bootstrap ERROR]${NC} $*" >&2; }

# ── Safety checks ─────────────────────────────────────────────────────────────
if [ "$(id -u)" -eq 0 ]; then
    error "Do not run this script as root. Run as a normal user with sudo access."
    error "Example: sudo adduser deploy && sudo usermod -aG sudo deploy && su - deploy"
    exit 1
fi

info "Starting Study Timer VPS bootstrap..."
info "Clone target: $CLONE_DIR"

# ── Step 1: System packages ───────────────────────────────────────────────────
info "Updating package lists and installing git..."
sudo apt-get update -qq
sudo apt-get install -y git curl

# ── Step 2: Docker ────────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
    info "Docker already installed: $(docker --version)"
else
    info "Installing Docker Engine (official script)..."
    curl -fsSL https://get.docker.com | sh
    info "Docker installed: $(docker --version)"
fi

# ── Step 3: Add user to docker group ─────────────────────────────────────────
if groups "$USER" | grep -q docker; then
    info "User '$USER' is already in the docker group."
else
    info "Adding '$USER' to the docker group..."
    sudo usermod -aG docker "$USER"
    warn "You must log out and back in (or run 'newgrp docker') for this to take effect."
fi

# ── Step 4: Clone repository ─────────────────────────────────────────────────
if [ -d "$CLONE_DIR/.git" ]; then
    info "Repository already exists at $CLONE_DIR — skipping clone."
else
    info "Cloning $REPO_URL → $CLONE_DIR..."
    git clone "$REPO_URL" "$CLONE_DIR"
fi

cd "$CLONE_DIR"

# ── Step 5: Prepare .env ──────────────────────────────────────────────────────
if [ -f ".env" ]; then
    warn ".env already exists — not overwriting. Review it manually."
else
    cp .env.example .env
    info ".env created from .env.example"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
info "Bootstrap complete!"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Log out and back in (so docker group applies):"
echo "     exit   # then SSH back in"
echo ""
echo "  2. Generate VAPID keys (run once — saves to clipboard or note them down):"
echo "     docker run --rm node:20-alpine sh -c 'npx --yes web-push generate-vapid-keys'"
echo ""
echo "  3. Generate a PUSH_SERVICE_TOKEN:"
echo "     openssl rand -hex 32"
echo ""
echo "  4. Edit .env with your values:"
echo "     nano $CLONE_DIR/.env"
echo "     # Set: DOMAIN, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,"
echo "     #      VITE_VAPID_PUBLIC_KEY, PUSH_SERVICE_TOKEN, POCKETBASE_ADMIN_TOKEN"
echo ""
echo "  5. Make scripts executable and deploy:"
echo "     chmod +x $CLONE_DIR/scripts/*.sh"
echo "     $CLONE_DIR/scripts/deploy.sh"
echo ""
echo "  6. After first deploy, visit https://\$DOMAIN/_/ to create the PocketBase admin."
echo ""
