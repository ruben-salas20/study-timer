#!/bin/sh
docker compose -f /opt/study-timer/docker-compose.prod.yml exec -T pocketbase sqlite3 /pb/pb_data/auxiliary.db <<'EOF'
.mode line
SELECT level, substr(message, 1, 200) AS msg, substr(data, 1, 800) AS detail
FROM _logs
WHERE level >= 4
ORDER BY rowid DESC
LIMIT 5;
EOF
