# Proposal to consolidate to six PostgreSQL tables

The [current schema](database-overview.md) has 13 tables in one PostgreSQL database per environment. Reducing the count to six changes the backend and requires a data migration. The frontend can keep its existing API shapes if the backend preserves the fields, identifiers, and authorization behavior it relies on.

## Target schema

| Table | Proposed responsibility |
| --- | --- |
| `app_users` | Firebase-linked app profiles and an array of preferred category names. |
| `events` | Event details and an array of category names. |
| `event_participations` | One RSVP row per user and event. Keep the unique key and indexes for event rosters and user history. |
| `conversations` | Event conversation keyed by event, or a direct conversation with two participant foreign keys in canonical order. |
| `messages` | One row per message, linked to the conversation and sender. Keep indexed pagination by conversation, timestamp, and ID. |
| `notifications` | Recipient inbox and delivery state, including `read_at` and `published_at`. |

- Fold `user_category_preferences` and `event_categories` into arrays. Replace `categories` with a shared application catalog if category names are a fixed list. Export the existing catalog and check callers of `GET /categories` before choosing how to preserve its IDs. Keep validation of allowed category names in both write paths.
- Derive event chat access from the host and eligible RSVPs. For direct chat, store both participant IDs in `conversations` and enforce distinct participants and uniqueness for the ordered pair. Replace `conversation_members` checks with authorization at read and send time. Enforce valid senders on insert and decide how to retain messages from former members.
- Move the `notification_outbox` publish timestamp into `notifications`. Backfill existing delivery state, preserve the transaction that creates inbox rows, and index unpublished rows so a worker can claim and retry pending deliveries.
- Removing `groups` and `group_members` requires deferring group-organized events. Events API and Image API both check organizer permissions. Inventory group rows, memberships, and group-owned events before deciding whether any can be archived or transferred to individuals. If group roles are still required, the two relational tables should stay.

## Backend changes and effort

| Work | Areas | Estimate |
| --- | --- | ---: |
| Inventory constraints and existing data | Category IDs and names, group ownership, chat participants, and pending notifications | 0.5 day |
| Move category data | Events API reads, filters, and writes, User API profile and history queries, shared catalog, Prisma, and seeds | 1–1.5 days |
| Update chat storage and permissions | Event membership and direct pairs, message storage, pagination, and Socket.IO access tests | 1.5–2 days |
| Move notification delivery state and resolve group rights | Event notification trigger, chat delivery worker, Events API and Image API authorization | 1–1.5 days |
| Rehearse migrations and verify API behavior | Backfill and rollback rehearsal, integration tests, and representative query plans | 1–1.5 days |

**Estimate: 5–7 engineer-days**, assuming the team agrees to defer groups, category values are a fixed catalog, and the database holds a small dataset. Existing live chat runs in memory. This estimate includes implementing durable chat for the consolidated shape and retaining any PostgreSQL chat rows. Recovering messages from a running memory store would require a separate export before restart.

## Migration sequence

1. Inventory the target environment and take a PostgreSQL backup. Record counts and ID mappings. Resolve any group ownership and invalid direct conversation pairs.
2. Add the category arrays, direct participant fields, and notification delivery fields. Backfill them and validate counts, category values, participant IDs, and pending notifications. Keep the original tables during the transition.
3. Deploy the API changes together in a short maintenance window for writes, or use a compatibility period with dual writes if uptime requires it. Keep event IDs, Firebase UIDs, image keys, and response formats stable.
4. Verify event discovery, category filtering, profile history, image permissions, RSVP changes, event chat, direct chat, and notification retry and read state. Switch reads after parity checks. Drop the old tables in a later migration once the rollback window closes. In a compatibility rollout, roll back reads and code while the old representation is current. Rehearse restoring the backup before removing old data.

## Performance

Table count alone does not predict speed. Arrays can remove joins from profile and event reads. Category-filtered events may need a GIN index and an overlap or containment query. Keep B-tree indexes for date and city filtering, RSVP lookups, message paging, and notification inboxes. Compare `EXPLAIN (ANALYZE, BUFFERS)` for category-filtered Explore, profile history, event rosters, chat history, and notification delivery against a representative dataset before removing the existing tables.
