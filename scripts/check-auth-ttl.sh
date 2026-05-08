#!/bin/sh
docker compose -f /opt/study-timer/docker-compose.prod.yml exec -T pocketbase sqlite3 /pb/pb_data/data.db <<'EOF'
.mode line
SELECT name, json_extract(options, '$.authToken.duration') AS auth_ttl_sec
FROM _collections WHERE type='auth';
EOF
