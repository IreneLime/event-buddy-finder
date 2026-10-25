# Event Buddy Finder: Project Proposal

## Project Introduction (@Irene)
Event Buddy Finder is a social event-discovery platform for people across the Greater Toronto Area who want to explore local events and connect with others who share their interests. Individuals can browse a shared calendar of events grouped by category, location, attendance, and other details. Users can track events they are interested in, join event-specific group chats, and directly message people with similar interests. Registered groups can publish and update event listings, while administrator oversight helps keep information trustworthy. By combining event discovery with social interaction, Event Buddy Finder helps users make informed plans and find companions before attending an event.

## 1. Motivation (@Irene)
The goal of Event Buddy Finder is to create a centralized platform that combines event discovery with finding people to attend events with. It is intended for people who may not want to attend an event alone, whose friends may not share the same interests, or who feel uncertain about trying an unfamiliar activity. Registered organizers can post events and categorize them by event type, age group, date, location, price, capacity, and accessibility. Users can filter events by category so that people with similar interest can find relevant events and connect with one another. In addition, users can join event-specific group chats to find event details and people with common interests and plans. This can make attending events more comfortable, help users make informed plans, and encourage them to try new activities. For example, someone interested in a concert or workshop could view its details, join the event group chat, and find a companion before attending.

Existing applications often focus mainly on either finding events or meeting people. Eventbrite, for example, focuses on event discovery, registration, and ticket management, while Bumble For Friends focuses on matching nearby people and arranging activities with existing matches. Neither platform focuses on helping users find companions while browsing public event listings. Event Buddy Finder addresses this gap by bringing event discovery, communication, and companion finding into one centralized platform. After finding an event, users can join its group chat or directly message others who are interested in attending. This keeps event information and social interaction together while also helping organizers understand attendee interests and collect feedback.


## 2. Objectives, Architecture, and Key Features

### 2.1 Objectives and Scope (@Grace)

### 2.2 Architecture and Technology Stack (@cathy)

### 2.3 Basic Features (@Bella)

### 2.4 Advanced Features and Feasibility (@Bella)

### 2.5 End-to-End User Interaction Flow (@cathy)

## 3. Project Plan and Team Responsibilities (@Grace)

## 4. Initial Team Reasoning and AI-Assisted Exploration (@Irene)
### 4.1 Initial Team Reasoning (@Irene)
Our team initially identified a gap between discovering events and finding people with similar interests to attend them with. We proposed a React and TypeScript frontend connected through REST APIs to an Express and TypeScript backend, with Firebase providing email-verified authentication, and PostgreSQL for database. A relational database would store users, organizers, events, registrations, chat rooms, and messages as connected records. Our main open questions were how to implement real-time messaging and how to model these relationships so event, user, and chat data remain consistent, which requires detailed investigation and database structure planning.

### 4.2 Exploration and Evaluation (@Irene)
Through team discussion, we defined the application’s general structure, key user scenarios, frontend components, and initial backend logic. We also planned to use patterns from the course assignments and lectures as a baseline for organizing and developing the code. After establishing the feature requirements and initial design ourselves, we used AI primarily to track the project requirements while we refine detailed designs. Specifically, any detailed design suggestions were checked against our initial list of feature requirement before being incorporated into our design, ensuring that it does not conflict with the intended functionality or required technology stack.
