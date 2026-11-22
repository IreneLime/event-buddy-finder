# Browser end-to-end check

The Chromium test signs up two users against the Firebase Auth Emulator, verifies them, completes their profiles through the user API, and then exercises the connected event and chat services: create an event, find it as another user, mark interest, exchange a Socket.IO message, cancel the event, and check the live and saved notification. It also checks that all five backend health endpoints respond and fails on unexpected API errors.

Image GETs return the normal `404` fallback when no file is attached. Uploading to DigitalOcean Spaces is not part of this local test because it requires a configured bucket and credentials.

## Prerequisites

- Node.js 20.19 or newer, pnpm, PostgreSQL, and Java 21 for the Firebase Auth Emulator.
- Install workspace dependencies and the Chromium browser once:

  ```sh
  pnpm install
  pnpm exec playwright install chromium
  ```

Create a dedicated, empty PostgreSQL database. The script refuses to use a database unless its name starts with `event_buddy_e2e` and it refuses to seed an already initialized schema.

```sh
createdb event_buddy_e2e
export E2E_DATABASE_URL=postgresql://YOUR_LOCAL_DB_USER@localhost:5432/event_buddy_e2e
./scripts/prepare-e2e-database.sh
pnpm test:e2e
```

The Playwright command starts Firebase Auth Emulator and all application services, then opens Chromium. The E2E-created Firebase accounts are ephemeral emulator accounts; user profiles and events live only in the dedicated E2E database. To rerun from a clean database, drop and recreate only `event_buddy_e2e`, then repeat the commands above.

The preparation script applies migrations 001–004 and loads the demo seeds. The browser flow uses the consolidated six-table schema and PostgreSQL chat persistence.
