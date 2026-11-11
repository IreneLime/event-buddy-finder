# Database

The initial PostgreSQL schema is in `migrations/001_initial_schema.sql`. It models profiles linked to Firebase IDs (including an optional age range and affiliation), groups and memberships, events and participation, categories, chats, messages, and persistent event notifications.

## Apply locally

Create a PostgreSQL database, then run:

```sh
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
```

The backend will be written in TypeScript and will use parameterized SQL queries through the PostgreSQL client selected by the team. The schema is SQL-first for now because the repository does not yet contain an application or ORM setup.

## Design notes

- Firebase Authentication owns passwords and identity. `app_users.firebase_uid` stores the Firebase UID; backend requests must validate the Firebase ID token and use its UID to find the app profile.
- Firebase's `email_verified` claim must be checked by the backend before profile completion or event posting. The database does not store a second, potentially stale copy of that verification state.
- Profiles store an optional age range rather than a birth date or exact age, and an optional free-text affiliation (for example, a school or program). Group memberships remain separate in `group_members`.
- An event has a creator and may have an organizing group. Group organizer permissions and event ownership must be checked by the backend; attendees can mark themselves interested or going without organizer approval.
- `event_participations` has at most one current row per user and event, with a status of `interested`, `going`, or `withdrawn`. An event's `cancelled` status is separate from a user's `withdrawn` participation status.
- Joining an event chat creates or updates the user's participation to `interested`. Users marked interested or going can access the chat. The backend should apply the participation change and conversation membership in a transaction. Direct conversations should contain exactly two users; the backend enforces this rule.
- Event updates and cancellations should save a notification for each affected interested or going attendee before Socket.IO broadcasts to currently connected users. The inbox indexes support loading recent and unread notifications.
- `profile_image_key` and `events.image_object_key` store DigitalOcean Spaces object keys. Image bytes stay in Spaces; the TypeScript backend will handle upload and download access and associate each key with its profile or event record.
- Event/category many-to-many relationships support multiple categories per event. Date and location indexes support the event browse and filter queries.

## Initial assumptions to review

- Users choose whether they are interested or going; the app does not have an organizer approval step for attendance.
- Chat membership requires an interested or going participation status; joining the chat records interest if the user has no participation row yet.
- Group event creation and management require an `organizer` membership role.
- Event location is stored as a display name/address, with optional coordinates for map pins.

