# Database

Event Buddy Finder uses PostgreSQL. Migrations `001`–`003` build the original schema; `004_consolidate_schema.sql` migrates it to the six-table schema documented in [database-overview.md](../docs/database-overview.md). Prisma models and generated TypeScript types are maintained alongside these SQL migrations; SQL remains authoritative for PostgreSQL checks and partial indexes.

The database overview documents each consolidated table, its columns and keys, the relationships, the changes from the original 13-table layout, and the main application access paths. The consolidation rationale and tradeoffs are in [database-consolidation.md](../docs/database-consolidation.md).

## Apply locally

Create a PostgreSQL database, set `DATABASE_URL`, and run the migrations in order:

```sh
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f database/migrations/002_event_city_and_notes.sql
psql "$DATABASE_URL" -f database/migrations/003_realtime_event_notifications.sql
psql "$DATABASE_URL" -f database/migrations/004_consolidate_schema.sql
psql "$DATABASE_URL" -f database/migrations/005_chat_message_notifications.sql
pnpm --filter @event-buddy/database db:generate
pnpm --filter @event-buddy/database db:seed
```

Migration 004 folds category associations into arrays, replaces direct-chat membership rows with the two participant IDs, moves notification delivery state into `notifications`, and removes the old join/catalog/group/outbox tables. It runs transactionally and stops if it finds group records, group memberships, group-owned events, malformed direct conversations, or duplicate direct-chat pairs. Resolve or export such records before applying it; do not remove the preflight checks to force the migration through. Back up any shared or production database before migrating it.

For the full 20-event and 20-profile demo dataset, apply these optional seeds
in order after the schema migrations:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/001_demo_data.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/002_explore_demo.sql
```

The four primary demo profiles include past Going and upcoming Interested RSVPs.

The schema is maintained as PostgreSQL SQL migrations, with Prisma ORM 7 providing generated TypeScript models and typed database access for the TypeScript backend. The `@event-buddy/database` workspace package exports a shared Prisma client and model types for the Express services; generated client code is not committed. SQL migrations remain the source of truth for database constraints that Prisma's schema does not express, such as status checks.

The typed seed uses placeholder Firebase UIDs such as `demo-cathy`; it does not create Firebase Authentication accounts. It is development-only fictional data. Frontend demo accounts are defined in `apps/web/src/data/demo-users.ts`; development IDs map to the seeded database UIDs for event, chat, and notification requests.

## Design notes

- Firebase Authentication owns passwords and identity. `app_users.firebase_uid` stores the Firebase UID; backend requests validate the Firebase ID token and use its UID to find the app profile. Firebase's `email_verified` claim is checked by the backend before profile completion or event posting.
- Profiles store an optional age range, affiliation, profile image object key, and preferred category names. The fixed category catalog is shared in TypeScript; PostgreSQL checks the allowed values and GIN indexes support category filtering.
- An event has an individual creator, category names, and an optional image object key. Group-owned events and group profiles are outside the initial scope.
- `event_participations` has at most one row per user and event, with a status of `interested`, `pending_approval`, `going`, `declined`, or `withdrawn`. Attendees can mark themselves interested or going without organizer approval; event cancellation is tracked separately.
- Event-chat access is derived from the event creator and eligible RSVP status. Direct conversations store exactly two distinct participants in canonical order. Messages persist in PostgreSQL and refer to a conversation and sender; the backend enforces current access on every read and send.
- Message-sender and direct-chat participant foreign keys restrict hard deletion of users referenced by chat history. Account deactivation/anonymization is the intended future removal path; account deletion is not currently implemented.
- Event-chat sends and RSVP upserts use the same transaction-scoped advisory lock keyed by event ID. This serializes a send with withdrawal, including a creator's first explicit withdrawal when no RSVP row exists yet.
- Event updates and cancellations insert persistent inbox notifications for affected interested, pending, or going participants. `published_at` tracks delivery to connected users; the Socket.IO worker can retry unclaimed notifications after a restart.
- `profile_image_key` and `events.image_object_key` store DigitalOcean Spaces object keys. Image bytes stay in Spaces; the TypeScript image service uploads, downloads, and associates object keys with their profile or event record.
- Date, city, RSVP, chat-pagination, and inbox indexes support the principal access paths. Category arrays use GIN indexes.

## Development image fixtures

The development bucket contains private fixtures referenced by `database/seeds/001_demo_images.sql`. After migrations and the main seed, associate them with demo records by running:

```sh
psql "$DATABASE_URL" -f database/seeds/001_demo_images.sql
```

The image seed is idempotent and development-only; do not apply it in production.
