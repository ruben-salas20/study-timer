#!/bin/sh
# Show recent HTTP requests for a specific user via auth token in logs.
docker compose -f /opt/study-timer/docker-compose.prod.yml exec -T pocketbase sqlite3 /pb/pb_data/auxiliary.db <<'EOF'
.mode line
SELECT level, datetime(created, 'unixepoch') AS at, substr(message, 1, 250) AS msg
FROM _logs
WHERE rowid > (SELECT MAX(rowid) FROM _logs) - 12
  AND (message LIKE '%study_sessions%' OR message LIKE '%users/auth%' OR message LIKE '%friendships%' OR message LIKE '%challenges%')
ORDER BY rowid DESC;
EOF
