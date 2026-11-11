# Web app

React 19 + TypeScript single-page app built with Vite, React Router, Tailwind CSS, and reusable Radix/CVA-based UI primitives following shadcn/ui patterns.

## Current pages

The app includes event discovery, event details, create/edit event, event and direct-message chat views, a profile, profile editing, and a sign-in/register screen. Data is local mock state in `src/state/event-store.tsx`; it resets on reload. Form controls and navigation are present to support parallel UI work, but authentication, uploads, maps, REST requests, and Socket.IO are placeholders.

## Where to contribute

- `src/pages/` — route-level screens
- `src/components/` — shared page and UI components
- `src/data/` — demonstration content
- `src/state/` — frontend-only state adapters; replace with API-backed data access later
- `src/lib/` — formatters and shared UI helpers

Keep page components focused on presentation. When APIs are agreed, add a typed client/data layer rather than calling `fetch` directly in every component.
