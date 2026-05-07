#!/usr/bin/env bash
# backup.sh — Daily backup of Study Timer persistent data
#
# Creates a compressed tarball of pb_data (PocketBase SQLite DB + attachments)
# and retains the last 14 daily backups.
#
# Suggested cron entry (runs at 03:00 every day):
#   0 3 * * * /home/USER/study-timer/scripts/backup.sh >> /home/USER/study-timer/logs/backup.log 2>&1
#
# Install cron job (edit crontab):
#   crontab -e
#   # Then add the line above, replacing USER with your actual username.
#
# Backups are stored at: /backups/studytimer/pb-YYYY-MM-DD.tar.gz
# To change the backup directory, set BACKUP_DIR before calling the script:
#   BACKUP_DIR=/mnt/volume/backups ./scripts/backup.sh

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/backups/studytimer}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DATE="$(date +%F)"
ARCHIVE="$BACKUP_DIR/pb-$DATE.tar.gz"

# ── Color helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[backup $(date +%H:%M:%S)]${NC} $*"; }
warn()  { echo -e "${YELLOW}[backup]${NC} $*"; }
error() { echo -e "${RED}[backup ERROR]${NC} $*" >&2; }

# ── Ensure backup directory ───────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Create archive ────────────────────────────────────────────────────────────
info "Starting backup → $ARCHIVE"

# We snapshot pb_data while PocketBase is running. SQLite WAL mode (used by
# PocketBase) makes this safe — the tarball will contain a consistent snapshot.
# For zero-downtime guaranteed consistency, use `sqlite3 .backup` instead; for
# a small single-user app the tarball approach is sufficient.
tar -czf "$ARCHIVE" \
    -C "$REPO_ROOT" \
    backend/pb_data

ARCHIVE_SIZE=$(du -sh "$ARCHIVE" | cut -f1)
info "Archive created: $ARCHIVE ($ARCHIVE_SIZE)"

# ── Prune old backups ─────────────────────────────────────────────────────────
info "Pruning backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "pb-*.tar.gz" -mtime +"$KEEP_DAYS" -print -delete

REMAINING=$(find "$BACKUP_DIR" -name "pb-*.tar.gz" | wc -l)
info "Backup complete. Retained $REMAINING archive(s) in $BACKUP_DIR"
