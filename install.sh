#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

case "${1:-}" in
  --cloud) shift; exec ./deploy/local/install-cloud.sh "$@" ;;
  -h|--help)
    printf '%s\n' 'Usage: ./install.sh [--stop | --cloud [--setup-only]]'
    exit 0 ;;
  ''|--stop) ;;
  *) printf '%s\n' 'Usage: ./install.sh [--stop | --cloud [--setup-only]]' >&2; exit 1 ;;
esac

if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  printf '%s\n' 'Install Docker Desktop or Docker Engine with Compose, then rerun ./install.sh.' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Start Docker, then rerun ./install.sh.' >&2
  exit 1
fi

compose=(docker compose --project-name event-buddy-local --file deploy/local/compose.yaml)
if [[ "${1:-}" == --stop ]]; then
  exec "${compose[@]}" down
fi

# Stop the APIs before applying schema changes on an existing database.
"${compose[@]}" stop app

if ! "${compose[@]}" up --build --detach --wait --wait-timeout 180; then
  "${compose[@]}" logs --tail=35
  printf '%s\n' 'Startup failed. Check the logs above and stop any other app using the localhost ports.' >&2
  exit 1
fi
printf '%s\n' 'Open http://127.0.0.1:5180' \
  'Demo accounts: cathy.chen@example.com and mina.park@example.com' \
  'Password for both: demo only' \
  'To stop the app: ./install.sh --stop'
