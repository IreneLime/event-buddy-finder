# PostgreSQL chat browser regressions

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres pnpm test:e2e:chat
```

`TEST_DATABASE_URL` identifies a local PostgreSQL server where the test user can
create databases. The stack creates a uniquely named `chat_browser_*` database,
applies migrations 001–004, and adds four fictional development profiles.
Each journey creates a new event through the actual events API and
writes RSVP through the browser. The stack drops only its own database on exit;
no existing application's database is seeded, truncated, or migrated.

Run only the public-profile DM regression:

```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres pnpm test:e2e:chat dm.spec.mts
```

`E2E_PORT_BASE` defaults to 4180; the web, events, chat, and test-only control
servers use consecutive loopback ports. Set another base to avoid a collision.
Playwright never reuses an existing stack. Tests use one Chromium worker and
retain screenshots and traces under `tests/e2e/test-results` on failure.

The stack runs the actual `services/chat-api/src/index.ts`. Its health must
report `storage: postgresql`, `membership: events-postgresql`, and
`notifications: postgresql`; there is no memory chat adapter. The control server
can stop and start that child process against the same disposable database.
The tests read message/notification rows directly to compare persisted IDs and
bodies with the delivered messages and inbox, then restart the actual process.

| Journey | Acceptance check |
| --- | --- |
| `dm.spec.mts` | Shared RSVP → public profile → one Message click opens the composer with one creation request; second account receives the first message; reopening reuses the DM; history and live replies survive process restart |
| `group-chat.spec.mts` | Browser RSVP unlocks event chat; both accounts receive live messages; same IDs/history and live sending work after restart and page reload |
| `notifications.spec.mts` | Real event edits and browser cancellation save and push alerts; inbox, unread count, and read state survive restart |

This suite tests the current frontend's explicit local demo login and existing
PostgreSQL schema. Firebase registration/verification and DigitalOcean image
uploads are separate integration checks. No backend API requests or socket
messages in these journeys are mocked.

Related checks:

```sh
pnpm typecheck:e2e
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres pnpm test:realtime:db
pnpm test:realtime
pnpm typecheck
pnpm build
```
