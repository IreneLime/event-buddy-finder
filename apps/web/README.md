# Web app

React and TypeScript SPA using Vite, React Router, Tailwind CSS, and shared UI components.

## Run the demo

Run `pnpm install` and `pnpm dev:web` from the repo root. With Firebase and the events API unconfigured, the app uses local demo accounts and events.

This frontend-only mode uses `apps/web/src/data/demo-users.ts` and
`apps/web/src/data/mock-events.ts`; it does not read the PostgreSQL seeds. Use
the local accounts on the sign-in page (password `123`) to review the prototype.
Chats and public profiles backed by seeded PostgreSQL data require the separate
chat and user APIs described below.

## Connect the APIs

1. Copy `apps/web/.env.example` to `apps/web/.env.local`. Fill in the Firebase web app configuration and enable email/password sign-in in the Firebase project. Keep Admin credentials and Spaces keys in the backend environments.
2. Apply PostgreSQL migrations 001–004 in order, then load the database-backed demo:
   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/001_initial_schema.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/002_event_city_and_notes.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/003_realtime_event_notifications.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/004_consolidate_schema.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/001_demo_data.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/002_explore_demo.sql
   ```
   Together, the seeds add 20 fictional profiles, 20 events, participation history, and sample chat messages. These rows are separate from Firebase accounts and are for local development only. `001_demo_images.sql` only adds object-key references; use it only after the corresponding image files have been uploaded to the configured Spaces bucket.
3. Configure auth, users, and images using their service-level `.env.example` files. Start `pnpm dev:auth`, `pnpm dev:users`, `pnpm dev:images`, and `pnpm dev:events` in separate terminals. Export `DATABASE_URL` and `FIREBASE_PROJECT_ID` for events-api, which reads its configuration from the process environment. Use the same Firebase project and PostgreSQL database across services. Set `WEB_ORIGIN` to the frontend origin if you change ports. For the Firebase Auth Emulator, set the browser emulator URL and `FIREBASE_AUTH_EMULATOR_HOST` on the Firebase-verifying services.
4. Start `pnpm dev:web`. Register, verify your email, and use **I’ve verified my email** to refresh your session. Submit the profile form to create your PostgreSQL profile. To check the public sample profile, open `/profile/demo-profile-user`.
5. For Firebase-backed chat, start `CHAT_DEV_MODE=false pnpm dev:chat` with the same `DATABASE_URL`, `WEB_ORIGIN`, and `AUTH_API_URL` pointing to your running auth service. For the seeded local demo identities, use `CHAT_DEV_MODE=true pnpm dev:chat`; this bypass is for development only. `VITE_CHAT_API_URL` points the browser at chat-api. Open `/chats` or `/notifications` after setting up a profile.
6. Set `VITE_EVENTS_API_URL` in `apps/web/.env.local` and restart the web app to browse the PostgreSQL-seeded events. Public profiles use the seeded rows when the users API is running. Clear `VITE_EVENTS_API_URL` to return to the frontend-only fixtures.

Photos upload after the profile or event is saved. If the upload fails, retry from the same form. Public views load signed image URLs and fall back to initials or event artwork when a photo is unavailable. Chat access follows event RSVPs. Notifications, messages, and direct conversations persist in PostgreSQL across chat service restarts.

UI code lives in `src/pages/` and `src/components/`. The API clients are in `src/lib/backend-api.ts`.

With Firebase unconfigured, pick Cathy, Mina, Alex, or Nadia on the sign-in page.
Each demo account uses password `123`. Open **My profile** to see the bio,
preferred categories, past events, and upcoming events marked **Interested**.
With the users API configured and the SQL fixtures applied, public profiles are
also available at `/profile/demo-cathy`, `/profile/demo-mina`,
`/profile/demo-alex`, and `/profile/demo-nadia`.

For a hosted Firebase preview, leave `VITE_FIREBASE_AUTH_EMULATOR_URL` and
`FIREBASE_AUTH_EMULATOR_HOST` unset, use the preview project's Firebase web
configuration and server credentials, and register real test accounts with
passwords that meet the project's policy. Registration assigns the Firebase UID;
the profile form creates the matching PostgreSQL row.

The database demo seed includes event and direct-chat messages. The chat API
reads and writes those messages in PostgreSQL, so they remain available after a
service restart.
