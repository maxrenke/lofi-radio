#!/usr/bin/env bash
#
# rebuild.sh — rebuild and restart the lofi-radio container via Docker Compose.
# Compose applies the nginx.conf mount, the C895 media mount, restart policy,
# and healthcheck — so always go through it rather than a bare `docker run`.

set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build
else
  docker-compose up -d --build
fi
