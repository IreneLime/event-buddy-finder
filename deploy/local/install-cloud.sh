#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."

fail() { printf '%s\n' "$*" >&2; exit 1; }

case "${1:-}" in
  '') ;;
  --setup-only) ;;
  -h|--help)
    printf '%s\n' 'Usage: ./install.sh --cloud [--setup-only]' 'Set up Event Buddy Finder and start it on http://localhost:5173.'
    exit 0 ;;
  *) fail 'Usage: ./install.sh --cloud [--setup-only]' ;;
esac
[[ $# -le 1 ]] || fail 'Usage: ./install.sh --cloud [--setup-only]'

if [[ ! -f .env.local-install ]]; then
  (umask 077; set -o noclobber; cat local-install.env.example > .env.local-install)
  fail 'Created .env.local-install. Fill in your team Firebase and Spaces settings, then rerun ./install.sh --cloud.'
fi

for command in node psql; do
  command -v "$command" >/dev/null || fail "Install $command first. See docs/deployment/README.md."
done
node -e 'if (+process.versions.node.split(".")[0] < 24) process.exit(1)' || fail 'Use Node.js 24 or newer.'
pnpm_version=$(node -p 'require("./package.json").packageManager.split("@")[1]')
if command -v pnpm >/dev/null && [[ $(pnpm --version) == "$pnpm_version" ]]; then
  package_manager=(pnpm)
else
  command -v npx >/dev/null || fail "Install pnpm $pnpm_version or use Node.js with npm and npx."
  package_manager=(npx --yes "pnpm@$pnpm_version")
fi

set -a
source ./.env.local-install
set +a
for setting in VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID \
  GOOGLE_APPLICATION_CREDENTIALS SPACES_ENDPOINT SPACES_BUCKET SPACES_ACCESS_KEY_ID SPACES_SECRET_ACCESS_KEY; do
  [[ -n ${!setting:-} ]] || fail "Fill in $setting in .env.local-install."
done
[[ "$GOOGLE_APPLICATION_CREDENTIALS" == /* && -r "$GOOGLE_APPLICATION_CREDENTIALS" ]] ||
  fail 'Set GOOGLE_APPLICATION_CREDENTIALS to a readable absolute path.'
export FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID"
node -e '
  const account = JSON.parse(require("node:fs").readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (account.type !== "service_account" || account.project_id !== process.env.FIREBASE_PROJECT_ID || !account.client_email || !account.private_key) process.exit(1);
' || fail 'Use a Firebase service account JSON from the same project as the web app.'

unset PORT FIREBASE_AUTH_EMULATOR_HOST VITE_USE_FIREBASE_AUTH_EMULATOR VITE_FIREBASE_AUTH_EMULATOR_URL
export HOST=127.0.0.1 WEB_ORIGIN=http://localhost:5173 AUTH_API_URL=http://localhost:4003
export CHAT_DEV_MODE=false ALLOW_DEV_AUTH=false
export VITE_EVENTS_API_URL=http://localhost:4001 VITE_CHAT_API_URL=http://localhost:4002
export VITE_USERS_API_URL=http://localhost:4004 VITE_IMAGE_API_URL=http://localhost:4005
export DATABASE_URL="${DATABASE_URL:-postgresql://$(id -un)@localhost:5432/event_buddy_finder}"

"${package_manager[@]}" install --frozen-lockfile

# Connect to the maintenance database only when the target connection fails.
if ! psql -X "$DATABASE_URL" -Atqc 'SELECT 1' >/dev/null 2>&1; then
  maintenance_url=$(node -e '
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = "/postgres";
    console.log(url.href);
  ')
  database_name=$(node -e 'console.log(decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)))')
  [[ -n "$database_name" ]] || fail 'DATABASE_URL must name a database.'
  psql -X "$maintenance_url" -v ON_ERROR_STOP=1 -v target="$database_name" <<'SQL'
SELECT pg_advisory_lock(hashtext('event-buddy-install-create'));
SELECT format('CREATE DATABASE %I', :'target')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'target')
\gexec
SQL
fi

sh deploy/local/migrate.sh --seed

if [[ "${1:-}" == --setup-only ]]; then
  printf '%s\n' 'Local setup complete.'
  exit 0
fi

node <<'JS'
const net = require('node:net');
for (const port of [4001, 4002, 4003, 4004, 4005, 5173]) {
  const server = net.createServer();
  server.once('error', () => {
    console.error(`Port ${port} is unavailable. Stop the process using it, then rerun ./install.sh --cloud.`);
    process.exitCode = 1;
  });
  server.listen(port, () => server.close());
}
JS

printf '%s\n' 'Open http://localhost:5173 after the services start. Press Ctrl+C to stop.'
exec "${package_manager[@]}" dev
