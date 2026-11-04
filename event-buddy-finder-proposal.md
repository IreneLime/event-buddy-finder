# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)
Event Buddy Finder is a social event-discovery platform for people across the Greater Toronto Area who want to explore local events and connect with others who share their interests. Individuals can browse a shared calendar of events grouped by category, location, attendance, and other details. Users can track events they are interested in, join event-specific group chats, and directly message people with similar interests. Registered groups can publish and update event listings. By combining event discovery with social interaction, Event Buddy Finder helps users make informed plans and find companions before attending an event.

## 1. Motivation (@Irene)
The goal of Event Buddy Finder is to create a centralized platform that combines event discovery with finding people to attend events with. It is intended for people who may not want to attend an event alone, whose friends may not share the same interests, or who feel uncertain about trying an unfamiliar activity. Registered organizers can post events and categorize them by event type, age group, date, location, price, capacity, and accessibility. The platform also gives organizers a direct way to answer questions, share updates, understand attendee interests, and collect feedback, helping them build stronger communities around recurring activities. Users can filter events by category so that people with similar interest can find relevant events and connect with one another. In addition, users can join event-specific group chats to find event details and people with common interests and plans. This can make attending events more comfortable, help users make informed plans, and encourage them to try new activities. For example, someone interested in a concert or workshop could view its details, join the event group chat, and find a companion before attending. By connecting people at the moment they discover an event, the platform creates a clearer path from interest to conversation, planning, and attendance while reducing the social pressure of joining an unfamiliar activity alone.

Existing applications often focus mainly on either finding events or meeting people. Eventbrite, for example, focuses on event discovery, registration, and ticket management, while Bumble For Friends focuses on matching nearby people and arranging activities with existing matches. Neither platform focuses on helping users find companions while browsing public event listings. Event Buddy Finder addresses this gap by bringing event discovery, communication, and companion finding into one centralized platform, with a simple interface that allows organizers to quickly post structured event listings and gives users direct access to event-specific communication tools. After finding an event, users can join its group chat or directly message others who are interested in attending. This keeps event information and social interaction together while also helping organizers understand attendee interests and collect feedback.


## 2. Objectives, Architecture, and Key Features

### 2.1.1 Objectives (@Grace)

The objective of this project is to develop a web application that combines event discovery with social interaction, allowing users to post and find local events, companions, and coordinate participation. The platform will provide an event calendar with search and filtering options, event creation and management, participation requests, ratings, and event chat. Organizers can manage event listings and approve attendance requests.

The project will focus on delivering a functional end-to-end workflow, from browsing events to connecting with other attendees. Advanced features will include authentication and real-time group chats. The implementation will use a React and TypeScript frontend connected to an Express backend, with PostgreSQL for structured data, Firebase for authentication, and Socket.IO for real-time interactions. Cloud storage will support profile pictures and event images. More complex functions such as waitlists, payment processing, and personalized recommendation will be outside the intial scope. 

### 2.1.2 Project Scope

#### Intended Usage

Event Buddy Finder is designed for individuals across the Greater Toronto Area who want to discover local events and find people to attend them with. Visitors can browse public event listings and filter activities based on their interests, dates, and locations. After signing in, users can express interest in an event, request to attend, and communicate with other interested users through event-specific group chats. Event organizers can create and manage listings, review attendance requests, and update event information. The platform aims to provide a simple and convenient experience that connects event discovery, participation, and social interaction in one place.

#### Functionality

The initial version will focus on the following core features:

- **User Authentication and Profiles:** Email-based registration, login, verification, and profile management.
- **Event Discovery:** Shared event calendar, searchable listings, category and date filters, and detailed event pages.
- **Event Management:** Event creation, editing, and image uploads.
- **Event Participation:** Interested status, attendance requests, and organizer approval or rejection.
- **Real-Time Group Chat:** Event-specific messaging with persistent chat history.
- **Event Notifications:** Real-time alerts for event updates and cancellations.
- **Responsive Web Interface:** Accessible layouts for browsers.

Advanced functionality such as personalized event recommendations, automated companion matching, and payment processing will remain outside the initial scope.


### 2.1.3 Feasibility

The project is feasible within the course timeline because its functionality can be divided into independent development tasks, so that team can work on frontend interfaces, event management, database integration, and communication features in parallel. By leveraging established frameworks and services, we can reduce implementation complexity and focus on the core user workflows. Development will prioritize core functions such as event discovery and participation features before integrating real-time communication and notifications, helping ensure a manageable and fully integrated application by the course timeline.



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

Event Buddy Finder supports the complete user journey, from discovering an event to communicating with potential attendees and preparing to participate.

**User Profile Management:** Upon registration, users can create profiles with a picture, name, and preferred event categories. These preferences help personalize the event discovery experience and allow users to identify others with similar interests.

**Event Discovery and Search:** Users can browse paginated event listings, search by keywords, and filter by criteria such as event category or date. A shared calendar provides an additional way to explore upcoming events and understand when activities are taking place. These discovery tools help users identify events that match their interests, preferences, and availability.

**Event Creation and Management:** Registered users can create and edit events. Daily event posting limits will also be implemented to discourage spam and prevent excessive event creation. 

**File Management:** Cloud storage supports uploading and retrieving user profile pictures and event images. Uploaded files are associated with their corresponding user or event records. Cloud-based storage also separates file management from the main application database, allowing the platform to manage images efficiently without storing large binary files directly in PostgreSQL.


### 2.4 Advanced Features (@Bella)

The following advanced features extend the basic functionality of Event Buddy Finder while supporting its main objective of connecting people through shared event interests.

**1. User Authentication and Authorization**

The platform will implement secure user registration, login, and email verification. Firebase Authentication will manage user identity and authentication sessions, while the backend will enforce access permissions for protected operations. Public visitors can browse event listings, whereas authenticated users with verified email addresses can access restricted features, including event creation and event group chats.

The backend will validate authentication tokens and verify user permissions before processing protected API requests. Role-based and resource-level authorization will ensure that users can only perform actions permitted by their roles and ownership. For example, users can edit or delete their own events but cannot modify events created by others. Similarly, only interested event attendees can access the corresponding event group chat and send messages.

**2. Real-Time Functionality: Event Group Chats**

Each event will have a dedicated group chat accessible through its event listing. Participants can use the chat to ask questions, coordinate attendance, and connect with others before an event. New messages will appear without requiring a page refresh, and previous conversations will remain available when users return to the chat, and would be accessible to new users to the chat.

Socket.IO will provide real-time communication between clients and the Express backend. When a user sends a message, the server will verify their authentication status and chat permissions, save the message in PostgreSQL, and broadcast it to authorized participants in the corresponding chat room. When users open a chat, the backend will retrieve its message history from the database.

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

The development of this project will be divided into four main stages:

**Phase 1 – Planning and System Design:** We will finalize the feature requirements, database schema, API endpoints, and overall application architecture. We will also set up the development environment, and shared coding conventions to support parallel development.

**Phase 2 – Core Feature Development:** We will work in parallel on the main components, including frontend development, user authentication and profiles, event discovery and management, participation requests, and database integration. The initial goal is to establish a working end-to-end flow from user registration to event participation.

**Phase 3 – Advanced Features and Integration:** Once the core functionality is established, we will implement real-time group chats and event notifications using Socket.IO. Frontend components will be connected to the backend APIs, with particular attention to authentication, data consistency, and communication between services.

**Phase 4 – Testing and Deployment:** The final stage will focus on integration testing, bug fixing, and UI improvements. We will test major user workflows, including event creation, attendance approval, real-time messaging, and notifications.

**Project Duration:** November 2–27, 2026 (4 Weeks)

| Development Tasks | Responsible | Week 1 (Nov 2–6) | Week 2 (Nov 9–13) | Week 3 (Nov 16–20) | Week 4 (Nov 23–27) |
|---|---|:---:|:---:|:---:|:---:|
| **1. Planning & Design** | | | | | |
| Requirements & architecture design | All | ███ | | | |
| Database schema & API contracts | @CathyChen, All | ███ | | | |
| Repository & environment setup | All | ███ | | | |
| **2. Backend Development** | | | | | |
| User authentication APIs | @IreneLi | ███ | ███ | | |
| User profile management APIs | @IreneLi | | ███ | ███ | |
| Event CRUD & listing APIs | @BellaHuang | ███ | ███ | | |
| Event participation & map APIs | @BellaHuang | | ███ | ███ | |
| Database & cloud storage setup | @CathyChen | ███ | ███ | | |
| **3. Frontend Development** | | | | | |
| Login & user profile pages | @CathyChen | | ███ | | |
| Event listings & calendar view | @CathyChen | | ███ | ███ | |
| Event creation & detail pages | @CathyChen | | ███ | ███ | |
| **4. Real-Time Features** | | | | | |
| Event-specific group chats | @GraceLi | | ███ | ███ | |
| Real-time event notifications | @GraceLi | | | ███ | |
| **5. Integration & Testing** | | | | | |
| Unit & basic integration tests | All | | ███ | ███ | |
| Frontend-backend integration | All | | | ███ | ███ |
| End-to-end testing & bug fixes | All | | | | ███ |
| Deployment & documentation | All | | | | ███ |
| **Final Submission** | All | | | | ◆ Nov 27 |

**Legend:** ███ Active Development | ◆ Milestone


### Team Responsibilities

The initial division of responsibilities is organized as follows:

- **Irene (@IreneLi) – User Management:** Responsible for developing backend REST APIs for user authentication and profile management features.
- **Bella (@BellaHuang) – Event Management:** Responsible for developing backend REST APIs for event creation, listing, updating, and user interactions with events, including map-related functionality.
- **Grace (@GraceLi) – Chat and Notifications:** Responsible for implementing event-specific group chats and real-time notifications using Socket.IO.
- **Cathy (@CathyChen) – Database, Cloud Storage, and Frontend:** Responsible for database schema design, PostgreSQL and cloud storage setup, as well as frontend development, including the login page, calendar view, event listing page, event creation page, and user profiles.

Each team member will be responsible for conducting unit tests and basic integration tests for their assigned components during development. After the components are integrated, the team will collaboratively perform end-to-end testing to verify complete user workflows and ensure proper communication between the frontend, backend services, and database.

To support parallel development, the team will establish shared API contracts and database schemas early in the project. GitHub feature branches and pull requests will be used to coordinate code changes, while regular communication will help identify dependencies and resolve integration issues.

### Integration and Risk Management

To support parallel development, we will define shared API contracts and database schemas before implementing dependent features. Development will be managed through GitHub using separate feature branches and pull requests, with regular integration to identify compatibility issues early. Key technical risks include Firebase authentication integration, maintaining consistent event participation statuses, and managing real-time Socket.IO connections. These risks will be addressed through early testing of critical interactions and incremental integration rather than combining all components at the end. If time becomes limited, priority will be given to completing the core event discovery and participation workflows before adding optional enhancements.


## 4. Initial Team Reasoning and AI-Assisted Exploration (@Irene)
### 4.1 Initial Team Reasoning (@Irene)
Our team initially identified a gap between discovering events and finding people with similar interests to attend them with. We proposed a React and TypeScript frontend connected through REST APIs to an Express and TypeScript backend, with Firebase providing email-verified authentication, and PostgreSQL for database. A relational database would store users, organizers, events, registrations, chat rooms, and messages as connected records. Our main open questions were how to implement real-time messaging and how to model these relationships so event, user, and chat data remain consistent, which requires detailed investigation and database structure planning.

### 4.2 Exploration and Evaluation (@Irene)
Through team discussion, we defined the application’s general structure, key user scenarios, frontend components, and initial backend logic. We also planned to use patterns from the course assignments and lectures as a baseline for organizing and developing the code. After establishing the feature requirements and initial design ourselves, we used AI primarily to track the project requirements while refining the detailed designs. Any suggestions were checked against our initial feature requirements before being incorporated, ensuring that they did not conflict with the intended functionality or required technology stack. One specific AI-assisted interaction involved comparing monolithic and microservice architectures based on their complexity, scalability, integration effort, and feasibility for our timeline. After considering these trade-offs, we proposed a small microservice-style design consisting of an event-and-participation service and a chat-and-notification service. To keep the project manageable, the two services share one PostgreSQL deployment and do not use a separate message broker.
