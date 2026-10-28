# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)

## 1. Motivation (@Irene)

## 2. Objectives, Architecture, and Key Features

### 2.1 Objectives and Scope (@Grace)

The objective of this project is to develop a web application that combines event discovery with social interaction, allowing users to post and find local events, companions, and coordinate participation. The platform will provide an event calendar with search and filtering options, event creation and management, participation requests, ratings, and event chat. Organizers can manage event listings and approve attendance requests.

The project will focus on delivering a functional end-to-end workflow, from browsing events to connecting with other attendees. Advanced features will include authentication and real-time group chats. The implementation will use a React and TypeScript frontend connected to an Express backend, with PostgreSQL for structured data, Firebase for authentication, and Socket.IO for real-time interactions. Cloud storage will support profile pictures and event images. More complex functions such as waitlists, payment processing, and personalized recommendation will be outside the intial scope. 

The project is feasible within the course timeline because its functionality can be divided into independent development tasks, so that team can work on frontend interfaces, event management, database integration, and communication features in parallel. By leveraging established frameworks and services, we can reduce implementation complexity and focus on the core user workflows. Development will prioritize core functions such as event discovery and participation features before integrating real-time communication and notifications, helping ensure a manageable and fully integrated application by the course timeline.



### 2.2 Architecture and Technology Stack (@cathy)

### 2.3 Basic Features (@Bella)

### 2.4 Advanced Features and Feasibility (@Bella)

### 2.5 End-to-End User Interaction Flow (@cathy)

## 3. Project Plan and Team Responsibilities (@Grace)

The development of this project will be divided into four main stages:

**Stage 1 – Planning and System Design:** We will finalize the feature requirements, database schema, API endpoints, and overall application architecture. We will also set up the development environment, and shared coding conventions to support parallel development.

**Stage 2 – Core Feature Development:** We will work in parallel on the main components, including user authentication and profiles, event discovery and management, participation requests, and database integration. The initial goal is to establish a working end-to-end flow from user registration to event participation.

**Stage 3 – Advanced Features and Integration:** Once the core functionality is established, we will implement real-time group chats and event notifications using Socket.IO. Frontend components will be connected to the backend APIs, with particular attention to authentication, data consistency, and communication between services.

**Stage 4 – Testing and Deployment:** The final stage will focus on integration testing, bug fixing, UI improvements, and deployment. We will test major user workflows, including event creation, attendance approval, real-time messaging, and notifications.


**Project Duration:** November 2–27, 2026 (4 Weeks)

| Development Tasks | Week 1 (Nov 2–6) | Week 2 (Nov 9–13) | Week 3 (Nov 16–20) | Week 4 (Nov 23–27) |
|---|:---:|:---:|:---:|:---:|
| **1. Planning & Design** | | | | |
| Requirements & architecture design | ███ | | | |
| Database schema & API contracts | ███ | | | |
| Repository & environment setup | ███ | | | |
| **2. Core Development** | | | | |
| Authentication & user profiles | ███ | ███ | | |
| Event management & database APIs | ███ | ███ | ███ | |
| Event browsing, calendar & UI | | ███ | ███ | |
| Participation & moderation | | ███ | ███ | |
| Cloud image storage | | ███ | ███ | |
| **3. Advanced Features** | | | | |
| Real-time group chat | | ███ | ███ | |
| Event notifications | | | ███ | |
| **4. Integration & Delivery** | | | | |
| Frontend–backend integration | | | ███ | ███ |
| End-to-end testing & bug fixes | | | | ███ |
| Deployment & documentation | | | | ███ |
| **Final Submission** | | | | ◆ Nov 27 |

**Legend:** ███ Active development | ◆ Milestone


### Team Responsibilities

The initial division of responsibilities is proposed as follows:

- **:** User authentication, profile management, and administrator moderation features.
- **:** Backend architecture, PostgreSQL database design, event management, and participation APIs.
- **:** Frontend development, including event browsing, calendar views, event details, and responsive UI components.
- **:** Real-time group chats, event notifications, frontend-backend integration, and testing coordination.

Although each member will take primary ownership of specific components, all team members will contribute to code reviews, testing, and integration as needed.

### Integration and Risk Management

To support parallel development, we will define shared API contracts and database schemas before implementing dependent features. Development will be managed through GitHub using separate feature branches and pull requests, with regular integration to identify compatibility issues early. Key technical risks include Firebase authentication integration, maintaining consistent event participation statuses, and managing real-time Socket.IO connections. These risks will be addressed through early testing of critical interactions and incremental integration rather than combining all components at the end. If time becomes limited, priority will be given to completing the core event discovery and participation workflows before adding optional enhancements.


## 4. Initial Team Reasoning and AI-Assisted Exploration (@Irene)

