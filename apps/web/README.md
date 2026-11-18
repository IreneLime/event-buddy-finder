# Web app

React and TypeScript SPA using Vite, React Router, Tailwind CSS, and shared UI components.

## Run the demo

Run `pnpm install` and `pnpm dev:web` from the repo root. With Firebase and the events API unconfigured, the app uses local demo accounts and events. The chat screen connects to chat-api.

## Connect the APIs

1. Copy `apps/web/.env.example` to `apps/web/.env.local`. Fill in the Firebase web app configuration and enable email/password sign-in in the Firebase project. Keep Admin credentials and Spaces keys in the backend environments.
2. Apply PostgreSQL migrations 001–003 in order. For optional demo data, run `database/seeds/001_demo_data.sql`, then `database/seeds/002_explore_demo.sql` for 20 profiles and 20 events. Optionally run `database/seeds/001_demo_images.sql` for image references against that database. The demo database rows are separate from Firebase accounts.
3. Configure auth, users, and images using their service-level `.env.example` files. Start `pnpm dev:auth`, `pnpm dev:users`, `pnpm dev:images`, and `pnpm dev:events` in separate terminals. Export `DATABASE_URL` and `FIREBASE_PROJECT_ID` for events-api, which reads its configuration from the process environment. Use the same Firebase project and PostgreSQL database across services. Set `WEB_ORIGIN` to the frontend origin if you change ports. For the Firebase Auth Emulator, set the browser emulator URL and `FIREBASE_AUTH_EMULATOR_HOST` on the Firebase-verifying services.
4. Start `pnpm dev:web`. Register, verify your email, and use **I’ve verified my email** to refresh your session. Submit the profile form to create your PostgreSQL profile. To check the public sample profile, open `/profile/demo-profile-user`.
5. Start `CHAT_DEV_MODE=false pnpm dev:chat` with the same `DATABASE_URL`, `WEB_ORIGIN`, and `AUTH_API_URL` pointing to your running auth service. `VITE_CHAT_API_URL` points the browser at chat-api. Open `/chats` or `/notifications` after setting up a profile.
6. With `VITE_EVENTS_API_URL` set, Home and Explore use server events and categories. Event details, creation, editing, RSVPs, cancellation, and cover photos use their corresponding endpoints. Clear that URL to browse the demo fixtures instead.

Photos upload after the profile or event is saved. If the upload fails, retry from the same form. Public views load signed image URLs and fall back to initials or event artwork when a photo is unavailable. Chat access follows event RSVPs. Notifications persist in PostgreSQL, while messages and direct conversations reset when the chat service restarts.

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

Set `CHAT_LOAD_DEMO_HISTORY=true` when starting chat-api to display seeded event
messages in development. Live messages still use the memory store.
