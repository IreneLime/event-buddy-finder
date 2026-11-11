# Event Management – Backend Implementation Plan

**Project:** Event Buddy Finder  
**Developer:** Bella Huang  
**Responsibility:** Event Management Backend  
**Tech Stack:** Express.js, TypeScript, PostgreSQL, Firebase Authentication

---

## 1. Overview

This document outlines the implementation plan for the Event Management component of Event Buddy Finder.

The Event Management service is responsible for handling the event lifecycle, including event creation, discovery, modification, cancellation, and user participation.

The service will expose RESTful API endpoints through an Express.js backend, interact with the shared PostgreSQL database, and integrate with the authentication, user management, and notification services developed by other team members.

### Responsibilities

- Event creation and management (CRUD).
- Event discovery, search, and filtering.
- Event participation and interest tracking.
- Join requests and organizer approval.
- Event location and map-related functionality.
- API validation, authorization, and testing.
- Integration with chat and notification services.

---

## 2. API Design

All endpoints will be prefixed with `/api/events`.

### 2.1 Event Discovery and Retrieval

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/api/events` | Retrieve paginated events with optional filters | No |
| GET | `/api/events/:id` | Retrieve event details | No |
| GET | `/api/events/categories` | Retrieve available event categories | No |

#### GET `/api/events`

Retrieve a list of scheduled events.

**Supported query parameters:**

| Parameter | Description |
|---|---|
| `page` | Page number |
| `limit` | Number of events per page |
| `search` | Search by event title or description |
| `category` | Filter by event category |
| `startDate` | Filter by earliest event date |
| `endDate` | Filter by latest event date |
| `location` | Filter by event location |
| `sortBy` | Sorting field |
| `order` | Ascending or descending order |

Example:

```http
GET /api/events?page=1&limit=10&category=Sports&search=badminton
```

**Implementation requirements:**
- Support pagination.
- Support keyword search and filtering.
- Return scheduled events by default.
- Validate query parameters.
- Use parameterized SQL queries.
- Return pagination metadata alongside event results.

#### GET `/api/events/:id`

Retrieve complete information about an individual event.

The response should include:
- Event details.
- Organizer information.
- Associated group information, if applicable.
- Event location and coordinates.
- Event image URL.
- Participation counts.
- Authenticated user's participation status, when available.

---

### 2.2 Event Creation and Management

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/api/events` | Create a new event | Yes |
| PUT | `/api/events/:id` | Update an existing event | Yes |
| DELETE | `/api/events/:id` | Cancel an event | Yes |
| GET | `/api/events/my-events` | Retrieve events created by the current user | Yes |

#### POST `/api/events`

Create a new event.

**Request body:**

```json
{
  "title": "Badminton Meetup",
  "description": "Casual badminton session",
  "category": "Sports",
  "location": "Toronto Community Centre",
  "latitude": 43.6532,
  "longitude": -79.3832,
  "startTime": "2026-11-15T14:00:00Z",
  "endTime": "2026-11-15T16:00:00Z",
  "imageUrl": "https://example.com/image.jpg",
  "groupId": null
}
```

**Implementation requirements:**

1. Authenticate the requesting user.
2. Validate all required fields.
3. Verify that the specified group exists and the user has permission to publish on its behalf, if applicable.
4. Enforce daily event creation limits.
5. Insert the event into PostgreSQL.
6. Return the newly created event.

The authenticated user's ID will be used as the event's `creatorId`.

#### PUT `/api/events/:id`

Update an existing event.

**Implementation requirements:**
- Verify that the event exists.
- Verify that the requesting user is the creator or an authorized group administrator.
- Validate updated fields.
- Update the event record.
- Notify affected participants of relevant changes through the notification service.

#### DELETE `/api/events/:id`

Cancel an event.

Events should be soft-deleted by updating their status to `cancelled`, rather than permanently removing database records.

**Implementation requirements:**
- Verify event existence and ownership.
- Update event status to `cancelled`.
- Preserve existing participation records.
- Notify affected users through the notification service.

#### GET `/api/events/my-events`

Retrieve all events created by the authenticated user for the organizer dashboard.

---

### 2.3 Event Participation

Participation will be managed through a separate `event_participants` database table.

**Participation statuses:**

| Status | Description |
|---|---|
| `interested` | User is interested in attending |
| `pending_approval` | User has submitted a join request |
| `going` | Organizer has approved the request |
| `declined` | Organizer has declined the request |
| `cancelled` | User has cancelled their participation |

#### Participation API Endpoints

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/api/events/:id/interested` | Mark event as interested | Yes |
| DELETE | `/api/events/:id/interested` | Remove interested status | Yes |
| POST | `/api/events/:id/join-requests` | Submit a request to join | Yes |
| GET | `/api/events/:id/participants` | Retrieve event participants | Yes |
| GET | `/api/events/:id/join-requests` | Retrieve pending join requests | Yes |
| PATCH | `/api/events/:id/join-requests/:userId` | Approve or decline a request | Yes |
| DELETE | `/api/events/:id/participation` | Cancel participation | Yes |

#### POST `/api/events/:id/interested`

Create or update the user's participation record with status `interested`.

#### POST `/api/events/:id/join-requests`

Submit a request to join an event.

**Implementation requirements:**
1. Verify that the event exists and is scheduled.
2. Check for an existing participation record.
3. Create or update the participation record.
4. Set status to `pending_approval`.
5. Return the updated participation information.

#### PATCH `/api/events/:id/join-requests/:userId`

Approve or decline a user's join request.

**Request body:**

```json
{
  "status": "going"
}
```

Allowed values: `going`, `declined`.

**Implementation requirements:**
- Verify that the current user is the event organizer or authorized group administrator.
- Verify that the target user has a pending join request.
- Update the participation status.
- Return the updated participation record.

#### DELETE `/api/events/:id/participation`

Allow a user to cancel their participation.

The participation record should remain in the database with status `cancelled`.

---

### 2.4 Map and Location Functionality

Event records will store location information and geographic coordinates.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events/nearby` | Retrieve events within a geographic radius (optional) |

Example:

```http
GET /api/events/nearby?lat=43.6532&lng=-79.3832&radius=10
```

The frontend can use event coordinates to display static map markers on event detail pages.

**Initial implementation:**
- Store event location as a text field.
- Store latitude and longitude.
- Return coordinates in event API responses.
- Support filtering by location.

Nearby-event searching is an optional enhancement and should be implemented after the core event functionality.

---

## 3. Database Dependencies

The Event Management service will use the shared PostgreSQL database.

The following tables are required for this component.

### 3.1 Events

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Event ID |
| `title` | VARCHAR | Event title |
| `description` | TEXT | Event description |
| `category` | VARCHAR | Event category |
| `location` | VARCHAR | Event location |
| `latitude` | DECIMAL | Geographic latitude |
| `longitude` | DECIMAL | Geographic longitude |
| `start_time` | TIMESTAMPTZ | Event start time |
| `end_time` | TIMESTAMPTZ | Event end time |
| `image_url` | TEXT | Event image URL |
| `creator_id` | FK | User who created the event |
| `group_id` | FK, nullable | Associated organizing group |
| `status` | VARCHAR | `scheduled` or `cancelled` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |

### 3.2 Event Participants

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Participation record ID |
| `event_id` | FK | Associated event |
| `user_id` | FK | Participating user |
| `status` | VARCHAR | Participation status |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |

### 3.3 Database Constraints and Indexes

Coordinate with Cathy to establish:

- Unique constraint on `(event_id, user_id)` in `event_participants`.
- Foreign key constraints for users, groups, and events.
- Check constraint ensuring `end_time > start_time`.
- Valid event and participation status constraints.
- Indexes on frequently queried fields, including event start time, category, status, and participation event ID.

**Note:** Cathy is responsible for the overall database schema and setup. The event-related schema should be finalized collaboratively before implementing repository queries.

---

## 4. Backend Architecture

Use a modular structure to separate routing, request handling, business logic, and database operations.

```text
backend/
└── src/
    ├── app.ts
    ├── server.ts
    │
    ├── config/
    │   └── database.ts
    │
    ├── middleware/
    │   ├── authenticate.ts
    │   ├── errorHandler.ts
    │   └── validateRequest.ts
    │
    ├── modules/
    │   └── events/
    │       ├── event.routes.ts
    │       ├── event.controller.ts
    │       ├── event.service.ts
    │       ├── event.repository.ts
    │       ├── event.validation.ts
    │       │
    │       ├── participation.routes.ts
    │       ├── participation.controller.ts
    │       ├── participation.service.ts
    │       ├── participation.repository.ts
    │       └── participation.validation.ts
    │
    ├── types/
    │   └── express.d.ts
    │
    └── utils/
        └── ApiError.ts
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Routes | Define API endpoints and middleware |
| Controllers | Handle HTTP requests and responses |
| Services | Implement business logic and authorization |
| Repositories | Execute PostgreSQL queries |
| Validation | Validate request bodies and parameters |
| Middleware | Authentication and error handling |

### Request Flow

```text
HTTP Request
     |
     v
Route
     |
     v
Authentication Middleware
     |
     v
Request Validation
     |
     v
Controller
     |
     v
Service Layer
     |
     v
Repository Layer
     |
     v
PostgreSQL
```

---

## 5. Authentication and Authorization

Firebase Authentication is managed by Irene.

The Event Management service will integrate with her authentication middleware to verify user identities.

**Expected authentication behavior:**
- Public event browsing does not require authentication.
- Protected endpoints require a valid Firebase ID token.
- The authenticated user's identity is attached to the request.
- Authorization checks are enforced within the event service.

### Authorization Rules

| Action | Permission |
|---|---|
| Browse events | Public |
| View event details | Public |
| Create events | Authenticated users |
| Update events | Event creator or authorized group admin |
| Cancel events | Event creator or authorized group admin |
| Mark interested | Authenticated users |
| Request to join | Authenticated users |
| View pending requests | Event organizer/admin |
| Approve or decline requests | Event organizer/admin |

Never rely on a user ID supplied by the frontend to determine the identity of the requesting user. Use the authenticated identity provided by middleware.

---

## 6. Integration with Other Team Members

### Irene – User Management and Cloud Storage

**Dependencies:**
- Firebase authentication middleware.
- User identity and database relationships.
- Event image upload functionality.

**Integration:**
- Use authenticated user IDs as event creators.
- Verify group membership and permissions.
- Store uploaded event image URLs in event records.

### Cathy – Database and Frontend

**Dependencies:**
- PostgreSQL setup and connection.
- Finalized event and participation schemas.
- Agreed database table and column names.

**Integration:**
- Coordinate event-related database queries.
- Provide API contracts and response formats.
- Connect event APIs to frontend pages.

### Grace – Chat and Notifications

**Dependencies:**
- Chat service API contracts.
- Notification service integration mechanism.

**Integration:**
- Provide event and participant information.
- Ensure event cancellation triggers notifications.
- Ensure relevant event updates trigger notifications.
- Coordinate participation-based chat permissions.

**Suggested integration payload:**

```typescript
interface EventUpdatePayload {
  eventId: number;
  eventTitle: string;
  eventStatus: "scheduled" | "cancelled";
  affectedUserIds: string[];
}
```

The event service will identify affected users, while Grace's notification service will handle notification persistence and real-time delivery.

The team must agree on how the two backend services communicate, such as through internal HTTP endpoints.

---

## 7. Implementation Timeline

### Week 1 – Foundation and Database Integration

- [ ] Coordinate database schema with Cathy.
- [ ] Set up Express and TypeScript event service.
- [ ] Configure PostgreSQL connection.
- [ ] Integrate Firebase authentication middleware.
- [ ] Define event and participation TypeScript interfaces.
- [ ] Finalize API contracts.
- [ ] Implement basic event creation and retrieval.

### Week 2 – Event CRUD and Discovery

- [ ] Implement `GET /api/events`.
- [ ] Implement `GET /api/events/:id`.
- [ ] Implement event searching and filtering.
- [ ] Implement pagination.
- [ ] Implement `POST /api/events`.
- [ ] Implement `PUT /api/events/:id`.
- [ ] Implement event cancellation.
- [ ] Implement ownership and authorization checks.

### Week 3 – Participation Functionality

- [ ] Implement Interested functionality.
- [ ] Implement join requests.
- [ ] Implement participant retrieval.
- [ ] Implement organizer approval and decline.
- [ ] Implement participation cancellation.
- [ ] Test participation status transitions.
- [ ] Coordinate chat permissions with Grace.

### Week 4 – Integration

- [ ] Connect APIs to the frontend.
- [ ] Integrate event image uploads with Irene.
- [ ] Integrate event notifications with Grace.
- [ ] Verify event updates and cancellations trigger notifications.
- [ ] Implement location filtering and map coordinates.
- [ ] Resolve integration issues.

### Week 5 – Testing and Refinement

- [ ] Write and run API tests.
- [ ] Test authentication and authorization.
- [ ] Test invalid inputs and error responses.
- [ ] Perform end-to-end workflow testing.
- [ ] Fix bugs and improve error handling.
- [ ] Finalize API documentation.
- [ ] Assist with deployment and final integration.

---

## 8. Testing Strategy

Use Jest and Supertest for backend API testing, subject to the team's selected testing setup.

### 8.1 Event API Tests

| Test Case | Expected Result |
|---|---|
| Create event with valid data | 201 Created |
| Create event without authentication | 401 Unauthorized |
| Create event with invalid data | 400 Bad Request |
| Retrieve nonexistent event | 404 Not Found |
| Update another user's event | 403 Forbidden |
| Cancel an event | Event status becomes `cancelled` |
| Retrieve events with filters | Correct filtered results |

### 8.2 Participation Tests

- [ ] User can mark an event as interested.
- [ ] Duplicate participation records are prevented.
- [ ] User can submit a join request.
- [ ] Non-organizers cannot approve requests.
- [ ] Organizer can approve pending requests.
- [ ] Organizer can decline pending requests.
- [ ] User cannot directly set their status to `going`.
- [ ] User can cancel participation.
- [ ] Participation records remain when an event is cancelled.

### 8.3 End-to-End Integration Test

Test the following complete workflow:

1. User A creates an event.
2. User B discovers the event.
3. User B marks themselves as interested.
4. User B submits a join request.
5. User A approves the request.
6. User B gains access to the event chat.
7. User A cancels the event.
8. User B receives an event cancellation notification.

---

## 9. API Documentation

The REST APIs should be documented using Swagger/OpenAPI.

Documentation should include:

- Endpoint descriptions.
- HTTP methods and paths.
- Authentication requirements.
- Query parameters.
- Request body schemas.
- Response schemas.
- Possible HTTP status codes.
- Error response formats.

This documentation will serve as the integration reference for the frontend and other backend services.

---

## 10. Development Priorities

| Priority | Feature |
|---|---|
| Must Have | Event creation, retrieval, updating, and cancellation |
| Must Have | Event search, filtering, and pagination |
| Must Have | Interested and join request functionality |
| Must Have | Organizer approval and decline |
| Must Have | Authentication and authorization |
| Must Have | Database integration |
| Must Have | Event notification integration |
| Should Have | Organizer event dashboard |
| Should Have | Event category retrieval |
| Should Have | Static map display using coordinates |
| Optional | Nearby event search by geographic radius |

The primary goal is to deliver a complete event workflow, from event discovery to participation and communication, before implementing optional enhancements.

---

## 11. Key Considerations

1. **Database coordination:** Finalize the event and participation schemas with Cathy before implementing database operations.
2. **Participation lifecycle:** Define valid status transitions and ensure only authorized organizers can approve or decline join requests.
3. **Authorization:** All event ownership and group permissions must be verified by the backend.
4. **Event cancellation:** Preserve event and participation records to support notifications and historical data.
5. **Service integration:** Coordinate API contracts and communication between the event and notification services early.
6. **Scope management:** Prioritize core functionality within the five-week development timeline and avoid unnecessary complexity.

---

**End Goal:** A functional Event Management backend that supports event discovery, event creation and management, user participation, organizer approval, and integration with the application's real-time chat and notification features.