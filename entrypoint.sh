#!/bin/sh
set -eu

echo "=== Sky Sentinel startup ==="

# Ensure the persistent SQLite mount path exists.
mkdir -p /data

export SKY_SENTINEL_AUTO_BOOTSTRAP="${SKY_SENTINEL_AUTO_BOOTSTRAP:-1}"

if [ "$#" -gt 0 ]; then
    echo "=== Executing custom command ==="
    exec "$@"
fi

echo "=== Starting uvicorn on port ${BACKEND_PORT:-8000} ==="
exec uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port "${BACKEND_PORT:-8000}" \
    --proxy-headers \
    --forwarded-allow-ips='*'
