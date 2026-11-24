#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

case "${1:-}" in
  --cloud) shift; exec ./deploy/local/install-cloud.sh "$@" ;;
  -h|--help)
    printf '%s\n' 'Usage: ./install.sh [--stop | --cloud [--setup-only]]' 'Default: Docker app + local PostgreSQL + real Firebase and Spaces.'
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
  exec "${compose[@]}" down --remove-orphans
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  chmod 600 .env
  printf '%s\n' 'Created .env from .env.example. Add your Firebase web config, service-account path, and Spaces keys, then rerun ./install.sh.' >&2
  exit 1
fi
set -a
source ./.env
set +a
for setting in VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID \
  GOOGLE_APPLICATION_CREDENTIALS SPACES_ENDPOINT SPACES_BUCKET SPACES_ACCESS_KEY_ID SPACES_SECRET_ACCESS_KEY; do
  [[ -n ${!setting:-} ]] || { printf 'Fill in %s in .env.\n' "$setting" >&2; exit 1; }
done
[[ "$GOOGLE_APPLICATION_CREDENTIALS" == /* && -r "$GOOGLE_APPLICATION_CREDENTIALS" ]] || {
  printf '%s\n' 'Set GOOGLE_APPLICATION_CREDENTIALS in .env to the readable absolute path of the Firebase Admin JSON file.' >&2
  exit 1
}
node -e '
  const account = JSON.parse(require("node:fs").readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (account.type !== "service_account" || account.project_id !== process.env.VITE_FIREBASE_PROJECT_ID || !account.client_email || !account.private_key) process.exit(1);
' || { printf '%s\n' 'The Firebase Admin JSON must belong to VITE_FIREBASE_PROJECT_ID.' >&2; exit 1; }

# Stop the APIs before applying schema changes on an existing database.
"${compose[@]}" stop app

if ! "${compose[@]}" up --build --detach --wait --wait-timeout 180 --remove-orphans; then
  "${compose[@]}" logs --tail=35
  printf '%s\n' 'Startup failed. Check the logs above and stop any other app using the localhost ports.' >&2
  exit 1
fi
printf '%s\n' 'Open http://localhost:5180' \
  'Browse the seeded events without signing in. Register with your own email and verify it to create a profile, chat, or post events.' \
  'The seeded demo profiles are PostgreSQL display data, not Firebase login accounts.' \
  'To stop the app: ./install.sh --stop'
