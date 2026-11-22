# Real-time event notifications

> Apply the shared database migrations before following the integrated setup below.

Implements the in-app event alerts and optional browser alerts in proposal §2.6.

## User flow

1. Mark an event **Interested** or **Going**. Participation is saved through events-api.
2. The organizer edits the event or confirms **Cancel event** on its detail page.
3. Eligible online attendees receive a live alert and an updated unread count in the bell. Event details reload without a page refresh.
4. Open the bell → **View all notifications & settings**, or `/notifications`, to see saved updates, filter unread alerts, mark one/all read, and load older alerts.
5. Optionally click **Enable browser alerts**. Permission is requested only on this click. Browser alerts work while the app is open, including in another tab; preferences are stored separately for each signed-in account.

Demo: sign in as Mina in one browser profile and Cathy in another. Edit `/events/night-market` as Mina; Cathy receives an alert. Disconnect Cathy, edit again, and reconnect to see the saved update. The demo password is `123`.

## Persistence and delivery

- Migrations `003_realtime_event_notifications.sql` and `004_consolidate_schema.sql` install the event-update trigger and store delivery state in `notifications.published_at`. Event changes, recipient alerts, and delivery state commit or roll back together.
- Recipients have participation `interested`, `pending_approval`, or `going`. The actor, withdrawn users, declined users, and unrelated users are excluded. Schema support for pending/declined states is present; organizer approval endpoints remain separate work. Current self-service endpoints accept interested/going/withdrawn.
- Alerts identify date/time, location, title, details, attendance details, and category changes. An unchanged save creates no alert. Cancellation creates a cancellation alert.
- events-api sets the trusted actor inside the transaction. Recipients come from the database, not a client-provided list.
- chat-api uses PostgreSQL `LISTEN/NOTIFY` to wake a notification publisher, with a one-second recovery poll for missed signals and outages. Online delivery goes to authenticated per-user Socket.IO rooms. Inbox rows remain available after delivery, reconnects, and service restarts.
- Publication is at least once: a crash between emission and updating `published_at` can repeat an event. The frontend deduplicates by notification ID. This prototype runs one notification publisher; multiple chat replicas require fan-out coordination before deployment.
- Mark-read operations are scoped to the authenticated recipient. Changes are broadcast to that user's other connected tabs.
- Event chat membership reads the same PostgreSQL event/RSVP records owned by events-api; new events resolve a chat automatically and withdrawal revokes reads, sends, and future delivery. See [chat membership and its integration regression](../services/chat-api/README.md).
- The event frontend now reads and saves server records. Stable public IDs preserve seeded event links; generated events use their database ID. Chat messages continue to use the existing memory adapter; notification persistence is independent of chat history.

## Local setup

Apply migrations in order to a new database, then load the development fixtures:

```sh
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/event_buddy_finder
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/002_event_city_and_notes.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/003_realtime_event_notifications.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/004_consolidate_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/001_demo_data.sql
pnpm --filter @event-buddy/database db:generate
pnpm install
pnpm dev
```

For an existing database, apply only the migrations it has not yet received, in order; do not rerun the initial schema. Migration 004 preflights data it cannot represent and must not be forced past those checks. Set the same `DATABASE_URL` for events-api and chat-api. Development login IDs such as `cathy` map explicitly to seeded database UIDs such as `demo-cathy`; production uses verified Firebase UIDs without that mapping. Production still requires the existing Firebase verifier/token-provider integration.

The page is at `http://localhost:5173/notifications`. Email delivery is outside this proposal's event-alert flow.

## API

| Endpoint | Behavior |
| --- | --- |
| `GET /me/notifications?before=<id>` | Latest 50 alerts, total unread count, optional next cursor |
| `PATCH /me/notifications/:id/read` | Idempotently marks the caller's alert read |
| `PATCH /me/notifications/read-all` | Marks only the caller's alerts read |
| Socket `notification:created` | Saved ID, event link, title, message, timestamp |
| Socket `notifications:changed` | Refresh inbox after another tab marks alerts read |

Edit/cancel requests remain events-api `PATCH /events/:id` and `DELETE /events/:id`. In PostgreSQL notification mode, chat-api rejects legacy event edits through `UpdateGroupChat`; use the authoritative event routes.

## Validation

```sh
pnpm typecheck
pnpm build
pnpm --filter @event-buddy/web test
pnpm --filter @event-buddy/chat-api test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm --filter @event-buddy/events-api test
```

The database integration suite creates a separate temporary database, applies migrations and fixtures, exercises real HTTP/WebSocket connections and service restarts, and drops only that test database. It skips unless `TEST_DATABASE_URL` is explicitly supplied.
