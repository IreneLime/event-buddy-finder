# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)

## 1. Motivation (@Irene)

## 2. Objectives, Architecture, and Key Features

### 2.1 Objectives and Scope (@Grace)

### 2.2 Architecture and Technology Stack (@cathy)

Event Buddy Finder will have a React and TypeScript frontend, with a separate TypeScript and Express backend. The backend has two services: one for events and attendance, and another for chats and notifications. Visitors can browse public events without an account. Email-verified users can set up a profile and post events; signed-in users can show interest, chat, or ask to attend. Join requests stay pending until the event organizer approves or declines them. Socket.IO carries live chat and event alerts, PostgreSQL stores the app’s records, and DigitalOcean Spaces holds uploaded images.

#### Frontend

- **Stack:** React and TypeScript, styled with Tailwind CSS and shadcn/ui.
- **Interface:** A responsive calendar and event list with date, category, and location filters. Event pages show details, an “Interested” option, a “Request to Join” action, and event chat. The “Going” status appears after organizer approval.
- **Communication:** The frontend uses REST for event and attendance requests. Socket.IO handles live chat and event alerts, so users see changes without refreshing the page.

#### Backend services

- **Stack and API:** The backend will be implemented in Express.js and TypeScript, with documented REST endpoints for communication with the React frontend.
- **Services:** The backend will include an event and participation service for event listings and attendance requests, and a chat and notification service for messages and event alerts. Both services will use a shared PostgreSQL deployment to maintain consistency across related records. This simplifies cross-service data access but couples the services through a shared schema; limiting the design to two services avoids the additional complexity of a message broker.
- **Authentication:** Firebase Authentication will support sign-in and email verification. Each service will validate Firebase ID tokens before allowing protected actions. Email verification will be required to create a profile and post an event. Signed-in users can express interest, use event chats, or request to attend; the event organizer can approve or decline each request.
- **Statuses:** Events will have a `scheduled` or `cancelled` status. A separate user–event participation record will track `interested`, `pending_approval`, `going`, `declined`, or `cancelled`. Joining an event chat records interest. Attendance requests remain pending until the organizer approves or declines them; approval changes the status to `going`. For group-posted events, an authorized group organizer can manage the listing and decide attendance requests.

#### Database and file storage

- **PostgreSQL:** The database stores users and profiles, groups, group memberships, events, event participation, chat messages, and notifications. A `groups` table represents registered groups, while `group_members` links users to groups and records each member’s role. Each event records its creator and, when posted on behalf of a group, the organizing group. The event service checks group membership and role before allowing members to post or manage that group’s events. The `event_participants` table links users to events and records interest or attendance status; messages and notifications link back to the relevant users and events.
- **Cloud storage:** We propose a DigitalOcean Spaces bucket for profile pictures and event images. The backend uploads the image to Spaces and saves its object key or URL in the related PostgreSQL record. The image itself stays in cloud storage, rather than in the database. Spaces is the object-storage service used as an example in the course and has an S3-compatible API.
- **Data access:** The event service handles group membership, event, and attendance records; it checks a member’s role before group event operations. The chat and notification service handles messages and alerts. Both use the documented backend APIs and PostgreSQL records.

#### Design rationale and security

We chose a separate React frontend and Express backend to keep the user interface and API responsibilities distinct and to support parallel frontend and backend development. Compared with a Next.js full-stack design, this requires more API coordination and authentication integration. PostgreSQL was selected over SQLite because users, groups, events, attendance, and messages have linked records that benefit from relational constraints and transactions. A server-based database also fits the two backend services, though using one shared schema couples them.

Security is a project risk because Firebase verifies identity but application-specific permissions remain the backend’s responsibility. Both services will validate Firebase ID tokens and check access to protected actions, including group event management, chat, and attendance decisions. As a course prototype, the project will focus on these access controls rather than advanced abuse detection or a formal security audit.

#### Real-time notifications

When an event changes or is cancelled, the backend saves an alert for interested users and people whose join requests are pending or approved. Socket.IO delivers it to users who are online, and the app keeps it for people who reconnect later. The frontend refreshes the event and shows an in-app alert, with an optional browser notification if the user allows it.

The proposed architecture incorporates the required course technologies and supports two advanced features: authenticated access and real-time chat and event notifications. To keep the project achievable within the course timeline, the initial implementation will focus on event discovery and posting, attendance requests and approvals, and event-based communication. Firebase Authentication, a single PostgreSQL deployment, and two focused backend services provide the required capabilities with a limited infrastructure footprint.

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
       |                                    | users, groups, memberships,  |
       |                                    | events, participation,       |
       |                                    | messages, notifications      |
       |                                    +------------------------------+
       +-- (4b) Store/retrieve files -----------------------> DigitalOcean Spaces

  Frontend <--- (5) REST responses -------------------------- Backend
  Frontend <--- (6) Live chat and event update/cancellation alerts --- Backend (Socket.IO)
```

**How the pieces interact:** Users authenticate with Firebase and verify their email to create a profile or post an event, while public event browsing remains available without signing in. For protected REST requests and Socket.IO connections, the frontend sends a Firebase ID token, which the backend validates before allowing the action. The event service stores listings and attendance in PostgreSQL, while the chat service stores messages and alerts there. Uploaded images are stored in DigitalOcean Spaces, with their object keys or URLs saved in PostgreSQL. REST responses return requested data to the frontend, and Socket.IO delivers live messages and event alerts so connected users can see updates without refreshing.

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
      |                                      Post as individual or group member
      |                                                   --> Save in PostgreSQL
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
3. A verified user posts an event individually or on behalf of a group they are authorized to represent. The backend saves the event details in PostgreSQL and uploads any image to cloud storage; the listing then appears publicly.
4. A signed-in user can mark themselves as interested in an event or join its chat; joining the chat also records interest. To attend, they request to join. The request stays `pending_approval` until the event organizer approves it, setting the user’s status to `going`, or declines it.
5. When an event changes or is cancelled, the backend alerts interested users and people with pending or approved join requests. It saves notifications in PostgreSQL and sends live Socket.IO alerts to connected users. The frontend refreshes the event and shows an in-app alert, or a browser notification if the user has allowed them. Saved alerts are available when users return.

## 3. Project Plan and Team Responsibilities (@Grace)

## 4. Initial Team Reasoning and AI-Assisted Exploration (@Irene)

