# Database overview

After migrations `001`–`004`, Event Buddy Finder has **six application tables** in one shared PostgreSQL database per environment. The services use the same `DATABASE_URL`; Firebase Authentication stores login identities, DigitalOcean Spaces stores image files, and PostgreSQL stores profile/event object keys.

| Table | Main records and relationships |
| --- | --- |
| `app_users` | Firebase-linked profile, preferred category names, and profile image key. Referenced by event creators, participations, messages, and notifications. |
| `events` | Event details, category names, creator, and optional image key. Has participations, one event conversation, and notifications. |
| `event_participations` | One row per `(event_id, user_id)` with the user's status; joins users to events. |
| `conversations` | One event chat per event, or a direct chat with two canonical participant user IDs. |
| `messages` | Message body, sender, and conversation, with an index for cursor-based history paging. |
| `notifications` | Persistent recipient inbox, optional actor/event, read state, and real-time delivery state. |

The tables are joined through foreign keys. Explore reads events and creator profiles, filters categories with PostgreSQL array containment, and can aggregate participation counts. Profile history joins `app_users` → `event_participations` → `events`. Event-chat access is authorized against the event creator and RSVP status; direct-chat access checks the stored participant pair. Message history is paged by conversation and cursor. Notification delivery workers claim rows whose `published_at` is null, emit them to connected users through Socket.IO, and mark them published; the notification remains available in the inbox.

Category names and preferred categories are stored as PostgreSQL text arrays. The API validates them against a shared TypeScript catalog, database checks reject unknown values, and GIN indexes support category filters. This removes the category catalog and two category join tables while keeping the fixed list consistent.

The migration history intentionally preserves the original schema in migrations `001`–`003`; migration `004` transforms an existing database. It preflights group records and malformed or duplicate direct conversations, and rolls back if it detects records that the new model cannot represent. See [migration and setup notes](../database/README.md) and the [consolidation rationale](database-consolidation.md).
