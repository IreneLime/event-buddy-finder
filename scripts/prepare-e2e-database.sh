#!/usr/bin/env bash
set -euo pipefail

: "${E2E_DATABASE_URL:?Set E2E_DATABASE_URL to a disposable PostgreSQL database whose name starts with event_buddy_e2e}"

database_name="${E2E_DATABASE_URL##*/}"
database_name="${database_name%%\?*}"
case "$database_name" in
  event_buddy_e2e*) ;;
  *) echo "Refusing to seed '$database_name'; the database name must start with event_buddy_e2e." >&2; exit 1 ;;
esac

existing_schema="$(psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc "SELECT to_regclass('public.app_users') IS NOT NULL")"
if [ "$existing_schema" = "t" ]; then
  echo "The E2E database already has an app_users table. Recreate this dedicated test database before seeding." >&2
  exit 1
fi

psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/001_initial_schema.sql
psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/002_event_city_and_notes.sql
psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/003_realtime_event_notifications.sql

# PR #15 adds this migration; run it when testing the consolidated branch.
if [ -f database/migrations/004_consolidate_schema.sql ]; then
  psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/004_consolidate_schema.sql
fi
if [ -f database/migrations/005_chat_message_notifications.sql ]; then
  psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/005_chat_message_notifications.sql
fi
if [ -f database/migrations/006_demo_image_object_keys.sql ]; then
  psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/006_demo_image_object_keys.sql
fi

psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/001_demo_data.sql
psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/002_explore_demo.sql
psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/local/seed-event.sql
