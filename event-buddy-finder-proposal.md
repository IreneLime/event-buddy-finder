# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)

## 1. Motivation (@Irene)

## 2. Objectives, Architecture, and Key Features

### 2.1 Objectives and Scope (@Grace)

### 2.2 Architecture and Technology Stack (@cathy)

### 2.3 Basic Features (@Bella)

**Accounts and Profiles:** Users can register with email verification, log in and out securely, and create profiles with a picture, name, and preferred event categories.

**Event Discovery:** Users can browse paginated event listings, search by keywords, and filter by criterias such as event category or date. A shared calendar and event detail pages display details such as location, price, and capacity.

**Event Publishing:** Users can create and edit events subject to daily posting limits.

**Communication:** Each event will have an associated group chat where users can discuss plans and connect with potential attendees. Users can view previous messages, exchange messages in real time, and receive notifications when event details change.

**File Management:** Cloud storage supports uploading and retrieving profile pictures and event images linked to their corresponding records.


### 2.4 Advanced Features and Feasibility (@Bella)

**1. User Authentication and Authorization**

The platform will implement secure user registration, login, and email verification. Firebase Authentication will manage user identity and authentication sessions, while the backend will enforce access permissions for protected operations. Public visitors can browse event listings, whereas authenticated users with verified email addresses can access restricted features, including event creation and event group chats.

The backend will validate authentication tokens and verify user permissions before processing protected API requests. Role-based and resource-level authorization will ensure that users can only perform actions permitted by their roles and ownership. For example, users can edit or delete their own events but cannot modify events created by others. Similarly, only interested event attendees can access the corresponding event group chat and send messages.

**2. Real-Time Functionality: Event Group Chats**

Each event will have a dedicated group chat accessible through its event listing. Participants can use the chat to ask questions, coordinate attendance, and connect with others before an event. New messages will appear without requiring a page refresh, and previous conversations will remain available when users return to the chat, and would be accessible to new users to the chat.

Socket.IO will provide real-time communication between clients and the Express backend. When a user sends a message, the server will verify their authentication status and chat permissions, save the message in PostgreSQL, and broadcast it to authorized participants in the corresponding chat room. When users open a chat, the backend will retrieve its message history from the database.

### 2.5 End-to-End User Interaction Flow (@cathy)

## 3. Project Plan and Team Responsibilities (@Grace)

## 4. Initial Team Reasoning and AI-Assisted Exploration (@Irene)

