# Web app

React and TypeScript SPA using Vite, React Router, Tailwind CSS, and shared UI components.

## Run the demo

Run `pnpm install` from the repo root. The chat and user profile APIs are separate services, so start them and the web app in three terminals:

```sh
# Terminal 1: use a local PostgreSQL database with migrations 001–003 and demo data applied.
DATABASE_URL=postgresql://YOUR_ROLE@localhost:5432/YOUR_DATABASE pnpm dev:chat

# Terminal 2: use the same database for public profile lookups.
DATABASE_URL=postgresql://YOUR_ROLE@localhost:5432/YOUR_DATABASE pnpm dev:users

# Terminal 3
pnpm dev:web
```

In development, chat accepts the demo identity and maps `cathy` to the `demo-cathy` PostgreSQL profile. The `VITE_CHAT_API_URL` default points to `http://localhost:4002`; set it in `apps/web/.env.local` if the chat service uses another address. Public profile pages call the user service at `http://localhost:4004`. With Firebase and the events API unconfigured, the web app uses local demo accounts and event fixtures, but chat and public profiles still read identities and memberships from PostgreSQL.

If chats show a connection error, check that `pnpm dev:chat` is running and that its `DATABASE_URL` points to the seeded project database. If a public profile shows a service error, start `pnpm dev:users` with the same database URL.

## Connect the APIs

1. Copy `apps/web/.env.example` to `apps/web/.env.local`. Fill in the Firebase web app configuration and enable email/password sign-in in the Firebase project. Keep Admin credentials and Spaces keys in the backend environments.
2. Apply PostgreSQL migrations 001–003 in order. For optional demo data, run `database/seeds/001_demo_data.sql` and then `database/seeds/001_demo_images.sql` against that database. The demo database rows are separate from Firebase accounts.
3. Configure auth, users, and images using their service-level `.env.example` files. Start `pnpm dev:auth`, `pnpm dev:users`, `pnpm dev:images`, and `pnpm dev:events` in separate terminals. Export `DATABASE_URL` and `FIREBASE_PROJECT_ID` for events-api, which reads its configuration from the process environment. Use the same Firebase project and PostgreSQL database across services. Set `WEB_ORIGIN` to the frontend origin if you change ports. For the Firebase Auth Emulator, set the browser emulator URL and `FIREBASE_AUTH_EMULATOR_HOST` on the Firebase-verifying services.
4. Start `pnpm dev:web`. Register, verify your email, and use **I’ve verified my email** to refresh your session. Submit the profile form to create your PostgreSQL profile. To check the public sample profile, open `/profile/demo-profile-user`.
5. Start `CHAT_DEV_MODE=false pnpm dev:chat` with the same `DATABASE_URL`, `WEB_ORIGIN`, and `AUTH_API_URL` pointing to your running auth service. `VITE_CHAT_API_URL` points the browser at chat-api. Open `/chats` or `/notifications` after setting up a profile.
6. With `VITE_EVENTS_API_URL` set, Home and Explore use server events and categories. Event details, creation, editing, RSVPs, cancellation, and cover photos use their corresponding endpoints. Clear that URL to browse the demo fixtures instead.

Photos upload after the profile or event is saved. If the upload fails, retry from the same form. Public views load signed image URLs and fall back to initials or event artwork when a photo is unavailable. Chat access follows event RSVPs. Notifications persist in PostgreSQL, while messages and direct conversations reset when the chat service restarts.

UI code lives in `src/pages/` and `src/components/`. The API clients are in `src/lib/backend-api.ts`.
