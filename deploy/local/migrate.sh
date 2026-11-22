#!/bin/sh
set -eu

# Migrations and seeds run in one psql session so concurrent installs serialize.
# Each file and its ledger entry commit together. Historical files may wrap
# themselves in BEGIN/COMMIT, which the runner replaces with its transaction.
write_step() {
  file=$1
  step=$2
  printf "SELECT NOT EXISTS (SELECT 1 FROM deployment.applied_step WHERE name = '%s') AS pending \\gset\n" "$step"
  cat <<'SQL'
\if :pending
BEGIN;
SQL
  awk '
    { lines[NR] = $0 }
    !/^[[:space:]]*($|--)/ { if (!first) first = NR; last = NR }
    END {
      wrapped = lines[first] == "BEGIN;" && lines[last] == "COMMIT;"
      for (i = 1; i <= NR; i++)
        if (!wrapped || (i != first && i != last)) print lines[i]
    }
  ' "$file"
  printf "INSERT INTO deployment.applied_step (name) VALUES ('%s');\nCOMMIT;\n" "$step"
  cat <<'SQL'
\endif
SQL
}

batch=$(mktemp)
trap 'rm "$batch"' EXIT
cat > "$batch" <<'SQL'
SELECT pg_advisory_lock(hashtext('event-buddy-deployment-migrations'));
BEGIN;
CREATE SCHEMA IF NOT EXISTS deployment;
CREATE TABLE IF NOT EXISTS deployment.applied_step (name text PRIMARY KEY);

-- Adopt volumes provisioned by the original Compose setup.
SELECT to_regclass('public.app_users') IS NOT NULL AS legacy,
       NOT EXISTS (SELECT 1 FROM deployment.applied_step) AS untracked
\gset
\if :untracked
  \if :legacy
    INSERT INTO deployment.applied_step VALUES ('001_initial_schema.sql'), ('legacy-seed');
    INSERT INTO deployment.applied_step
    SELECT '002_event_city_and_notes.sql'
    WHERE EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'city'
    );
    INSERT INTO deployment.applied_step
    SELECT '003_realtime_event_notifications.sql'
    WHERE EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'public_id'
    );
    INSERT INTO deployment.applied_step
    SELECT '004_consolidate_schema.sql'
    WHERE EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'category_names'
    );
  \endif
\endif
CREATE TEMP TABLE available_migration (name text PRIMARY KEY);
SQL

for file in database/migrations/[0-9][0-9][0-9]_*.sql; do
  name=${file##*/}
  case "$name" in *[!a-zA-Z0-9_.-]*) echo "Invalid migration name: $name" >&2; exit 1 ;; esac
  printf "INSERT INTO available_migration VALUES ('%s');\n" "$name" >> "$batch"
done

cat >> "$batch" <<'SQL'
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(applied.name, ', ' ORDER BY applied.name) INTO missing
  FROM deployment.applied_step applied
  LEFT JOIN available_migration available USING (name)
  WHERE applied.name ~ '^[0-9]{3}_.*[.]sql$' AND available.name IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'The database has applied migrations missing from this checkout: %', missing
      USING HINT = 'Use a checkout containing those migrations or a separate database for the older checkout.';
  END IF;
END;
$$;
COMMIT;
SQL

for file in database/migrations/[0-9][0-9][0-9]_*.sql; do
  write_step "$file" "${file##*/}" >> "$batch"
done

if [ "${1:-}" = "--seed" ]; then
  cat >> "$batch" <<'SQL'
SELECT NOT EXISTS (SELECT 1 FROM deployment.applied_step WHERE name = 'legacy-seed') AS seed_demo \gset
\if :seed_demo
SQL
  write_step database/seeds/001_demo_data.sql seed-demo >> "$batch"
  write_step database/seeds/002_explore_demo.sql seed-explore >> "$batch"
  write_step deploy/local/seed-event.sql seed-event >> "$batch"
  printf '%s\n' '\endif' >> "$batch"
  write_step deploy/local/demo-account-emails.sql seed-demo-account-emails >> "$batch"
fi

psql -X "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$batch"
