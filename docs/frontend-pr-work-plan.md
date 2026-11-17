# Frontend Prototype and Backend Handoff

## PR 1: Frontend prototype

The frontend should work with local demo fixtures before the APIs are ready. Guests can browse and filter events; demo sign-in unlocks profile editing, event actions, and chats. Demo sign-in and fixture edits are browser-only and are not real authentication or database persistence.

Current frontend includes React, TypeScript, React Router, Tailwind CSS, shared UI components, public event browsing, city selection, card/calendar/map views, demo profiles, sample events and chats, and a sign-in screen with fictional test accounts. Map tiles use OpenStreetMap with required attribution; event markers use category emoji and custom styling.

### Check before merging

- Browse as a guest: events, detail pages, city selector, filters, calendar, and map; guest profile and chat pages should prompt for sign-in.
- Sign in with a demo account; confirm protected actions work and sign-out restores guest access.
- Check profile links from events and chats, event attendance counts, chat navigation, and mobile/desktop layouts.
- Check direct route loads, refresh, browser Back/Forward, map pan/zoom/search, and image/map failure states.
- Run `pnpm typecheck` and `pnpm build`.

## PR 2: Connect the backend

Replace mock adapters with typed API calls after the owners finalize the shared API contract. Connect Firebase sign-in and ID-token checks; event/profile reads and writes; PostgreSQL-backed participation and counts; chat history and Socket.IO delivery; and DigitalOcean Spaces uploads. Keep public event reads available to guests and enforce write/chat permissions on the server. Add city to event records and `GET /events` filters; persist notes and map coordinates. Use response/error/loading states and refresh affected event, profile, and chat data after mutations or socket events.

### Form submissions and API boundary

Assignment 4's `FormData` → server function → Prisma pattern is specific to Next.js Server Actions. Our selected architecture is a separate React frontend and Express backend, so the browser will submit to REST endpoints instead. When backend integration is ready, add `name` attributes to the form controls, build `new FormData(form)`, and `fetch()` the agreed Express endpoint; this supports image files as well as text fields. The Express service owner handles multipart parsing (for example, Multer), validation, cloud upload, and Prisma persistence. The frontend owner wires the form to that endpoint once its contract is agreed. For text-only forms, JSON is also reasonable. PR 1 remains local-demo only.

### Integration checks

- Guest can list, search, filter by city, and open public events; protected writes return unauthorized.
- Two accounts can mark interested/going, see consistent counts, and only permitted members can read/send in chats.
- Event edits/cancellations persist, notify affected users live when connected, and remain visible after reconnect.
- Profile/event image upload returns a stored URL/key that is saved and rendered from the related record.
- Verify invalid input, missing records, network failure, expired auth, reconnects, and map records without coordinates.

## React course concepts and caching

The current UI uses React component state, controlled inputs, context for shared demo auth/event/city state, effects for map updates, and React Router. PR 2 can apply the course's `fetch()` + `useEffect()` pattern with loading/error state and typed API responses. Those topics are covered in [Lecture 6: React Ecosystem, Data Fetching, and API Integration](https://www.eecg.utoronto.ca/~cying/courses/ece1724-web/slides/lecture-6/lecture-6.html). The prototype has no backend queries to cache; a client query cache is optional after API integration and measurement.

The reusable UI controls follow the course's component-based styling approach; the shared button exports `buttonVariants()` so links can use the same button styles. See [Assignment 4](https://www.eecg.utoronto.ca/~cying/courses/ece1724-web/assignments/assignment-4/) for its shadcn/ui and form submission examples. Since this repository uses React + Express, it will not use Next.js Server Actions directly.

## Run locally

```sh
pnpm install
pnpm dev:web
```

Use Node.js 22+ with the repository's pinned pnpm version. The frontend runs at `http://localhost:5173`.
