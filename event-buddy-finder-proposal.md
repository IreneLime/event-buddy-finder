# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)

## 1. Motivation (@Irene)

## 2. Objectives, Architecture, and Key Features

### 2.1 Objectives and Scope (@Grace)

### 2.2 Architecture and Technology Stack (@cathy)

Event Buddy Finder will have a React and TypeScript frontend, with a separate TypeScript and Express backend. The backend has two services: one for events and attendance, and another for chats and notifications. Visitors can browse public events without an account. Email-verified users can set up a profile and post events; signed-in users can show interest, chat, or ask to attend. Join requests stay pending until the event organizer approves or declines them. Socket.IO carries live chat and event alerts, PostgreSQL stores the app’s records, and DigitalOcean Spaces holds uploaded images.

#### Frontend

- **Stack:** React and TypeScript, styled with Tailwind CSS and shadcn/ui (or a similar component library).
- **Interface:** A responsive calendar and event list with date, category, and location filters. Event pages show details, an “Interested” option, a “Request to Join” action, and event chat. The “Going” status appears after organizer approval.
- **Communication:** The frontend uses REST for event and attendance requests. Socket.IO handles live chat and event alerts, so users see changes without refreshing the page.

#### Backend services

- **Stack and API:** Express.js with TypeScript provides the backend. Its REST endpoints will be documented in a shared API contract.
- **Services:** The event and participation service manages listings and join requests. The chat and notification service stores messages and sends event alerts. Both use one PostgreSQL deployment to keep related records consistent. Sharing a database ties the services to the same schema, so we’ll keep the design to these two services and skip a separate message broker.
- **Authentication:** Firebase Authentication handles sign-in and email verification, so we don’t need to build our own password and verification flow. Each service checks Firebase ID tokens. Email verification is required to set up a profile and post an event. Signed-in users can show interest, chat, or request to attend; the event organizer approves or declines each request.
- **Statuses:** Events are `scheduled` or `cancelled`. A user’s participation is `interested`, `pending_approval`, `going`, `declined`, or `cancelled`. Joining an event chat marks the user as interested. A request to attend stays pending until the organizer decides; approval changes it to `going`. Keeping event status separate from attendance status makes it clear who should receive event alerts.

#### Database and file storage

- **PostgreSQL:** The database stores users and profiles, events, event participation, chat messages, and notifications. The `event_participants` table links users to events and records interest or attendance status; messages and notifications link back to the relevant users and events. PostgreSQL suits these related records.
- **Cloud storage:** We propose a DigitalOcean Spaces bucket for profile pictures and event images. The backend uploads the image to Spaces and saves its object key or URL in the related PostgreSQL record. The image itself stays in cloud storage, rather than in the database. Spaces is the object-storage service used as an example in the course and has an S3-compatible API.
- **Data access:** The event service handles event and attendance records. The chat and notification service handles messages and alerts. Both use the documented backend APIs and PostgreSQL records.

#### Real-time notifications

When an event changes or is cancelled, the backend saves an alert for interested users and people whose join requests are pending or approved. Socket.IO delivers it to users who are online, and the app keeps it for people who reconnect later. The frontend refreshes the event and shows an in-app alert, with an optional browser notification if the user allows it.

This design uses the required course stack and includes authentication and real-time features. The first version focuses on finding and posting events, requesting and approving attendance, and chatting. Firebase, one PostgreSQL deployment, and two backend services keep the work manageable.

```
  +----------------------------------------+
  | FRONTEND                               |
  | React + TypeScript                     |
  | Tailwind CSS + shadcn/ui               |
  | Public browsing | Events | Chat        |
  +----------------------------------------+
       | (1) Sign up / sign in
       v
  +----------------------------------------+       +------------------------------+
  | Firebase Authentication               |       | DigitalOcean Spaces          |
  | Email verification                     |       | Profile and event images     |
  +----------------------------------------+       +------------------------------+

       | (2) REST requests + Socket.IO connection, with Firebase ID token
       v
  +----------------------------------------+
  | BACKEND                                |
  | Express + TypeScript                   |
  |                                        |
  | Event & participation service          |
  | Chat & notification service            |
  +----------------------------------------+
       | (3) Validate Firebase ID token --------------------> Firebase Authentication
       |
       +-- (4a) SQL queries and updates --> +------------------------------+
       |                                    | DATABASE                     |
       |                                    | PostgreSQL                   |
       |                                    | users, events, participation,|
       |                                    | messages, notifications      |
       |                                    +------------------------------+
       +-- (4b) Store/retrieve files -----------------------> DigitalOcean Spaces

  Frontend <--- (5) REST responses -------------------------- Backend
  Frontend <--- (6) Live chat and event update/cancellation alerts --- Backend (Socket.IO)
```

**How the pieces interact:** (1) Users sign in with Firebase and verify their email when setting up a profile or posting an event. (2) The frontend sends Firebase ID tokens with protected REST requests and its Socket.IO connection; public browsing remains available without signing in. (3) The backend checks tokens before allowing protected actions. (4) The event service stores events and attendance in PostgreSQL; the chat service stores messages and alerts there. Images go to DigitalOcean Spaces, with their keys or URLs saved in PostgreSQL. (5) REST responses return requested data to the frontend. (6) Socket.IO delivers live chat and event alerts to connected users, and the app refreshes the event view.

### 2.3 Basic Features (@Bella)

### 2.4 Advanced Features and Feasibility (@Bella)

### 2.5 End-to-End User Interaction Flow (@cathy)

```
VISITOR FLOW
  Visit site
      |
      v
  Browse / filter public events
      |
      +-- Browse only (no account required)
      |
      +-- To create a profile or post an event:
      |     Register / sign in --> Verify email --> Complete profile
      |                                             |
      |                                             v
      |                                      Post event --> Save in PostgreSQL
      |                                                     and image in cloud
      |                                                     storage --> Public listing
      |
      +-- To express interest, request to join, or chat:
            Register / sign in --> Open event details
                                      |
                     +----------------+----------------+
                     |                                 |
                     v                                 v
              Mark Interested /                  Request to join
              join event chat                           |
                     |                                  v
                     v                           Pending approval
              Save interest and                         |
              chat messages in                           v
              PostgreSQL                         Organizer approves or
                                                 declines request
                                                        |
                                                        v
                                                 Approved request sets
                                                 participation to Going

CANCELLATION / EVENT UPDATE NOTIFICATION FLOW
  Organizer updates or cancels an event
      |
      v
  Save event changes; find Interested / Pending / Going participants
      |
      v
  Save notifications in PostgreSQL
      |
      v
  Send Socket.IO alert to connected users --> Refresh event details/status
                                               + show in-app alert
                                               + optional browser notification
```

1. Visitors can browse the event calendar and filter public listings by date, category, or location without signing in.
2. To create a profile or post an event, a user signs up through Firebase Authentication and verifies their email. Signed-in users can also show interest, request to attend, or enter an event chat.
3. A verified user posts an event with its title, description, time, location, category, and optional image. The backend saves the details in PostgreSQL and uploads the image to cloud storage; the listing then appears publicly.
4. A signed-in user can mark themselves as interested in an event or join its chat; joining the chat also records interest. To attend, they request to join. The request stays `pending_approval` until the event organizer approves it, setting the user’s status to `going`, or declines it.
5. When an event changes or is cancelled, the backend alerts interested users and people with pending or approved join requests. It saves notifications in PostgreSQL and sends live Socket.IO alerts to connected users. The frontend refreshes the event and shows an in-app alert, or a browser notification if the user has allowed them. Saved alerts are available when users return.

## 3. Project Plan and Team Responsibilities (@Grace)

## 4. Initial Team Reasoning and AI-Assisted Exploration (@Irene)

