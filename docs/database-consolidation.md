# Six-table PostgreSQL schema

This branch consolidates the original 13-table database to six application tables. It includes a data-preserving migration, updated Prisma models, backend queries, and development seed data. The frontend API shapes stay stable where possible; category endpoint IDs now come from the shared fixed catalog rather than database-generated category IDs.

## Resulting tables

| Table | Responsibility |
| --- | --- |
| `app_users` | Firebase-linked profiles and preferred category names. |
| `events` | Event details and category names. |
| `event_participations` | One participation status per user and event. |
| `conversations` | Event chats or direct chats represented by an ordered participant pair. |
| `messages` | Messages linked to a conversation and sender. |
| `notifications` | Persistent inbox entries and real-time publication state. |

The static category catalog is in `@event-buddy/contracts`; category names are stored in PostgreSQL arrays and checked against the allowed values. GIN indexes support category filters. Event-chat membership is derived from the event creator and eligible RSVPs. The direct-message pair is canonicalized and unique. Notification delivery state moved from the outbox table to `notifications.published_at`.

Group profiles, group memberships, and group-organized events are deferred from the initial application scope. Migration 004 deliberately aborts if it finds group records or memberships rather than deleting them. It also aborts for direct conversations that do not contain exactly two members or duplicate conversations for the same pair. Export or resolve such rows before applying the migration.

## Migration and rollout

Apply migrations `001`–`004` in order; setup commands and cautions are in [database/README.md](../database/README.md). Migration 004 is transactional: it backfills user/event category arrays, direct-chat participant IDs, and notification delivery timestamps; replaces affected indexes/constraints and the event-notification trigger; then drops the superseded tables.

Back up any shared database first. This migration is a one-way schema transition for this deployment: after it commits, the old join tables are gone. Keep a tested backup available for rollback. It has not been applied to any shared or production database as part of this branch.

## Tradeoffs and limits

- Removing joins for the fixed category list simplifies profile and Explore queries. If administrators need to create categories dynamically, restore a normalized category table and join tables instead of extending the hard-coded catalog.
- Removing group tables narrows organizer support to individual users. Group event publishing should wait until group ownership and membership are included in the model again.
- Direct participant columns make a two-person conversation compact and enforce pair uniqueness. Supporting larger non-event groups would require a separate membership relation.
- Keeping inbox and delivery state on one notification row simplifies the schema and worker query. `published_at` means “Socket.IO publication attempted/claimed,” not proof that a browser received or displayed it; the saved inbox is the durable delivery path.
- PostgreSQL arrays and Prisma types fit this fixed category set. SQL migrations remain authoritative for check constraints and partial indexes; do not use an unreviewed Prisma schema push on a shared database.
- The services still share a database and schema, so they are not independently deployable with separate ownership boundaries. That coupling is accepted to keep the course project manageable.

## Access paths and indexes

The schema retains B-tree indexes for date/city event listing, creator event history, participation lookups, message cursor paging, and notification inboxes. GIN indexes serve preferred-category and event-category containment queries. Table count by itself does not guarantee faster queries; query plans should be inspected with representative data if performance becomes a concern.
