#!/bin/bash
# Quick debug script to dump PB internal logs related to hooks/errors.
docker compose -f /opt/study-timer/docker-compose.prod.yml exec -T pocketbase \
  sqlite3 /pb/pb_data/auxiliary.db <<'EOF'
.headers on
.mode line
SELECT level, substr(message, 1, 120) AS msg, substr(data, 1, 500) AS detail, datetime(created, 'unixepoch') AS at
FROM _logs
WHERE level >= 4 OR message LIKE '%hook%' OR message LIKE '%on-user-create%' OR message LIKE '%random%'
ORDER BY rowid DESC
LIMIT 15;
EOF
