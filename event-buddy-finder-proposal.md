# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)

## 1. Motivation (@Irene)

## 2. Objectives, Architecture, and Key Features

### 2.1 Objectives and Scope (@Grace)

### 2.2 Architecture and Technology Stack (@cathy)

### 2.3 Basic Features (@Bella)

**Accounts and Profiles:** Users can register with email verification, log in and out, and create profiles with a picture, name, academic program, and preferred event categories. Accounts have designated roles for individuals, registered groups, and administrators.

**Event Discovery:** Users can browse paginated event listings, search by keywords, and filter by criterias such as event category or date. A shared calendar and event detail pages display details such as location, price, capacity, age restrictions, and accessibility.

**Event Publishing and Moderation:** Users can create and edit events subject to daily posting limits. Administrators review submissions before publication to maintain reliable event information.

**Communication:** Users can access event-specific group chats, view message history, and receive automated notifications when event details change.

**File Management:** Cloud storage supports uploading and retrieving profile pictures and event images linked to their corresponding records.


### 2.4 Advanced Features and Feasibility (@Bella)

**1. User Authentication and Authorization**

The platform will support user registration and login, including email verification to ensure that users have authenticated email addresses. Authenticated users will be able to access protected features, such as joining event group chats and sending messages. The backend will verify authentication credentials or tokens and enforce access permissions through protected API endpoints.

This feature is feasible using established authentication frameworks such as Firebase, which can manage authentication flows and sessions. The team will integrate authentication with the application backend and database to associate users with their profiles, event participation, and messages. Authentication checks will ensure that unauthenticated visitors can browse publicly available event listings but cannot join group chats or send messages. This separation between public discovery and authenticated participation supports both usability and security.

**2. Real-Time Functionality: Event Group Chats**

The platform will provide a group chat feature accessible through a button on each event's listing page. Users interested in an event can open its associated chat to communicate with other users, discuss plans, ask questions, and find companions before attending. Only users with authenticated email addresses will be permitted to join chats and send messages. New messages will appear in real time without requiring users to refresh the page.

This feature will use Socket.IO to establish real-time communication between clients and the Express backend. When a user sends a message, the server will validate the user's authentication status and chat access before saving the message to PostgreSQL and broadcasting it to authorized participants in the corresponding chat room. Message history will be retrieved from the database when users open a chat, ensuring that previous conversations remain available even after they disconnect.


### 2.5 End-to-End User Interaction Flow (@cathy)

## 3. Project Plan and Team Responsibilities (@Grace)

## 4. Initial Team Reasoning and AI-Assisted Exploration (@Irene)

