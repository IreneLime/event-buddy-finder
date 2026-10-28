# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)

## 1. Motivation (@Irene)

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

### 2.3 Basic Features (@Bella)

### 2.4 Advanced Features and Feasibility (@Bella)

### 2.5 End-to-End User Interaction Flow (@cathy)

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

