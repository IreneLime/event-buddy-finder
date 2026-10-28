Project Proposal
Project Name: Taro - Coffee Chat Booking App

Collaborators: Kevin (@piyoki), Rex (@rexhanh), Leo (@Leo6Leo), Cathy (@icathychen)

Table of Contents
<!-- vim-markdown-toc GFM -->

[Motivation](#motivation)
[Problem Statement and Background](#problem-statement-and-background)
[Existing Solutions and Limitations](#existing-solutions-and-limitations)
[Target Users](#target-users)
[Why This Project is Worth Pursuing](#why-this-project-is-worth-pursuing)
[Objective and key features](#objective-and-key-features)
[Primary Objective](#primary-objective)
[Technical Stack](#technical-stack)
[Frontend](#frontend)
[Backend](#backend)
[Project Scope](#project-scope)
[Intended Usage](#intended-usage)
[Functionality](#functionality)
[Feasibility](#feasibility)
[System Architecture](#system-architecture)
[System Overview](#system-overview)
[System Components](#system-components)
[User Interface and Experience Design](#user-interface-and-experience-design)
[Application Features](#application-features)
[Nice-to-have Features](#nice-to-have-features)
[Deployment](#deployment)
[Monitoring and Alerting](#monitoring-and-alerting)
[Tentative Plan](#tentative-plan)
<!-- vim-markdown-toc -->

Motivation
Problem Statement and Background
Professional networking is essential for career growth, mentorship, and exploring new opportunities, especially for students and early-career individuals. However, the current process of initiating meaningful professional conversations is fragmented and inefficient. People often rely on cold outreach through LinkedIn, random networking events, or email introductions, which typically result in low response rates, lack of personalization, and inconsistent follow-up. Mentors who are willing to share their experience also lack a simple and structured way to manage incoming requests or offer time for brief conversations.

Coffee chats have emerged as a popular and effective way to build professional relationships through short, focused discussions. Yet, no dedicated platform exists to support this interaction end-to-end. Users must juggle multiple tools: LinkedIn for discovery, Calendly for scheduling, and separate messaging apps for communication, creating friction and reducing engagement. There is a need for a platform that streamlines professional connections by integrating discovery, scheduling, and messaging into a single seamless experience tailored specifically for meaningful one-on-one networking.

Existing Solutions and Limitations
Several professional networking and mentorship platforms, such as LinkedIn, Meetup, and Calendly, provide ways to connect with industry professionals or schedule meetings. However, these solutions have several limitations. LinkedIn, for instance, allows users to connect and message others but does not offer a structured way to schedule short, focused coffee chats. Meetup is event-oriented and better suited for group gatherings rather than one-on-one conversations. Calendly provides scheduling functionality but lacks integration with professional networking features or recommendations for users to find industry professionals relevant to their goals.

These limitations make it difficult for users to efficiently discover, connect, and schedule meaningful one-on-one networking sessions. Our project addresses these gaps by offering a dedicated platform for booking coffee chats that integrates professional profiles, personalized matching, and seamless scheduling.

Target Users
Early-Career Professionals / Students: Individuals seeking to learn from industry professionals, explore career paths, and build their professional network.

Industry Professionals / Mentors: Experienced professionals willing to offer guidance, mentorship, or career advice through structured short meetings.

Why This Project is Worth Pursuing
This project solves a clear and growing problem in professional networking: the lack of a dedicated platform for meaningful one-on-one coffee chats. Today, users must juggle multiple disconnected tools—LinkedIn for outreach, Calendly for scheduling, and separate messaging platforms—resulting in a fragmented and frustrating experience. By integrating professional discovery, structured messaging, and scheduling into a single platform, this project makes networking more accessible, personal, and efficient for students, early-career professionals, and mentors who want to share knowledge without friction.

Beyond addressing an unmet user need, this project is built on a modern, scalable, cloud-agnostic, event-driven architecture that makes it technically compelling and future-proof. Using Redis Streams, CloudEvents, and a clean publisher–broker–subscriber model ensures real-time responsiveness, fault tolerance, and seamless horizontal scalability. With PostgreSQL as the system of record and Redis for low-latency reads, the platform is engineered for performance and extensibility. This architecture not only enables a smooth MVP but also lays a solid foundation for future features such as personalized recommendations, AI-driven matching, and community expansion, making this project both impactful and worth pursuing.

Objective and key features
Primary Objective
The primary objective of this project is to build a user-friendly web application that streamlines professional networking by enabling users to discover, connect, and schedule meaningful one-on-one coffee chats in a simple and efficient way. The platform will integrate professional profiles, interest-based matchmaking, and lightweight messaging with automated scheduling and notifications, eliminating the friction caused by using multiple tools. By providing a dedicated space for mentorship and career conversations, the app aims to foster authentic professional relationships, support career development, and make networking more accessible to students, early-career professionals, and mentors alike.

In addition, the platform is designed with containerization and microservice scalability in mind. By packaging each functional component: Publisher, Broker, and Subscriber into OCI containers and orchestrating them with Kubernetes, the system achieves strong modularity, portability, and resilience. This ensures consistent deployments across environments, simplified CI/CD automation, and rapid fault isolation. Containerization also allows individual services to scale independently based on load—for example, horizontally scaling subscribers during peak chat activity—resulting in efficient resource utilization and high availability. This modern infrastructure approach further strengthens the reliability and long-term viability of the project.

Technical Stack
Frontend
The frontend will be implemented using React. The React frontend provides the cross-platform UI, navigation, and client-side state management. It will communicate with backend services (Publisher/Broker APIs and any REST endpoints) and consume event-driven updates as needed. Rex is primarily responsible for the frontend implementation, including wiring the React app to backend APIs, handling authentication flows, and building the main UI screens and reusable components.

Backend
Redis Streams for pub-sub messaging
Redis Hash for in-memory data store as cache for fast data retrieval
PostgreSQL for user data and chat history persistence
Publisher, Broker, and Subscriber event-driven backend services in Golang to handle chat requests and data processing
Kubernetes for container orchestration and deployment
Prometheus and Grafana for monitoring and alerting
Project Scope
Intended Usage
The Taro is designed to help users connect casually for coffee conversations without the hassle of complicated scheduling. Users start by signing up and creating a simple profile with basic information like their name, email, and affiliation. Once registered, they can browse through other users who are available and interested in chatting. When someone wants to reach out, they can send a broadcast chat request that goes out to all available users, similar to putting up a notice on a bulletin board saying "Hey, anyone want to grab coffee?" Other users can then see this invitation and express their interest if they're available. Once someone responds with interest, both participants can confirm the session and start chatting through the app's built-in messaging feature. The whole process is meant to be straightforward and informal, making it easy for people to meet new connections over coffee without overthinking it.

Functionality
Cross-platform React Web App.
Secure user registration and login.
Simple matchmaking via pub-sub fan-out backend.
Home page showing available users and requests.
In-app messaging or scheduled chat prompts (non-real-time).
The app is built using React, which means it works smoothly on both iOS and Android devices, so pretty much anyone can use it regardless of their phone. Security is a priority, so we've implemented secure user registration and login to make sure everyone's information stays protected. The matchmaking system uses a pub-sub fan-out backend architecture, which basically means when someone sends out a coffee chat invite, it efficiently broadcasts to all the relevant users who might be interested. The home page displays a clean interface showing available users and any active chat requests, making it super easy to see who's around and looking to connect. For communication, we've included in-app messaging and scheduled chat prompts, though it's worth noting that this isn't real-time chat like instant messaging—it's more asynchronous, so users can respond when it's convenient for them rather than needing to be constantly online. This design choice keeps things casual and low-pressure, which fits perfectly with the whole coffee chat vibe we're going for.

Feasibility
This project is highly feasible within the 1-month timeframe with strategic team allocation, proven technology choices, and a well-scoped project.

Team Structure and Parallel Development: Four team members will work simultaneously on different components. Kevin, Cathy, and Leo will focus on backend services (Publisher, Broker, Subscriber), while Rex handles frontend UI development.

Technology Stack Maturity: The selected technology stack: React, Golang, Redis, and PostgreSQL—consists of well-established, extensively documented technologies with strong community support. Our team's existing experience with these technologies will reduce onboarding time and implementation risks, enabling rapid development cycles.

Scope Management: The project prioritizes core functionality: user authentication, basic profiles, pub-sub matchmaking, and simple messaging. This focused approach avoids complex real-time infrastructure requirements while delivering a full user experience. The modular Publisher-Broker-Subscriber architecture supports incremental development, which allows individual team members to work on discrete, well-defined components that integrate seamlessly.

System Architecture
System Overview
The system is designed as a platform that enables users to discover and connect with others for one-on-one coffee chats through a seamless and scalable architecture. The frontend will be implemented with React. Authentication is managed by Firebase. The React frontend will communicate with backend services via HTTP/CloudEvent endpoints and consume event-driven updates from the backend.

On the backend, an event-driven architecture using Redis Streams enables a lightweight pub-sub matchmaking system for broadcasting chat requests and delivering invitations to available users. A Golang-based Publisher–Broker–Subscriber model manages message flow, reliability, and fault tolerance with support for a Dead Letter Queue. PostgreSQL stores persistent user profiles and chat history, while Redis is used as a high-speed cache to improve responsiveness. Together, these components enable real-time-like interactions, efficient matching, and a smooth user experience without the complexity of full real-time infrastructure.

System Components
Publisher: Responsible for generating and sending CloudEvents to the broker.

In the coffee chat app, a publisher represents a backend service that produces events based on user actions. For example, when a user initiates a new coffee chat invite or expresses interest in another’s invite, the frontend triggers the publisher service, which wraps that action in a CloudEvent and sends it to the broker. The publisher does not handle any business logic, persistence, or caching—it simply emits events to the broker.

Broker: Acts as a lightweight message router that receives CloudEvents from publishers and appends them to a Redis Stream.

The broker’s role is limited to event routing—it does not interact with databases, caches, or any application logic. Once it successfully appends the CloudEvent to the Redis Stream, it immediately returns an HTTP 204 (No Content) response to the publisher, indicating successful receipt. The broker is designed to remain stateless and horizontally scalable.

Subscriber: Listens to events published in the Redis Stream and performs business logic based on event type.

Subscribers are responsible for interacting with databases and caches: persisting event data to PostgreSQL, updating Redis Hashes for fast retrieval, and managing retries through the DLQ stream. In the coffee chat app, a subscriber represents a backend service that processes events such as new chat invites or user interests and updates the system state accordingly.

Frontend (React App):

The React frontend interacts only with backend microservices through APIs or event-driven endpoints. It does not directly touch the database or cache. When users perform actions (e.g., “Start a Coffee Chat” or “Express Interest”), the frontend triggers the publisher, which emits CloudEvents handled asynchronously downstream.

User Interface and Experience Design
Screen	Description
Authentication Page	This screen handles user login, registration, and password recovery. It ensures secure access to the app and allows users to manage their credentials.
Home Page	The main dashboard where users can view active users and incoming chat requests. Users also can select other users to send a coffee chat request on the Home Page. It serves as the central hub for user interaction, and facilitates initiating conversations with others
Chat Page	The primary interface for in-app messaging. It allows users to communicate directly within the app.
Application Features
This coffee chat booking application demonstrates advanced distributed systems concepts through event-driven architecture, containerized microservices, and comprehensive monitoring. The system enables users to create profiles, broadcast coffee chat invitations, express interest in others' invites, and communicate through a messaging platform.

Authentication: Secure user authentication using Firebase, allowing users to log in and register using their email and password. This ensures data security and user-specific access to the coffee chat platform.

User Profile Management: Allows users to create and edit comprehensive profiles with their name, bio, affiliation, and interests. This enhances personalization and enables better matching between users seeking coffee chats.

Pub-Sub Matchmaking System: Implements a publish-subscribe model where the backend receives a user's coffee chat request and broadcasts it to all available users through Redis Streams.

Match System: Enables users to accept coffee chat invitations through a structured workflow, ensuring mutual agreement and confirmed interest before initiating conversations.

Basic Messaging: Provides a simple messaging system that enables users to communicate effectively after matching. Messages are stored in PostgreSQL and retrieved through API calls.

Nice-to-have Features
Real-time Messaging: Enhances the chat experience by providing instantaneous message delivery and updates, creating a more engaging and responsive communication platform. This feature would require implementing WebSocket connections or integrating Firebase Real-time Database to handle live data streaming between users, enabling messages to appear immediately without manual refresh or polling.

Group Coffee Chats: Enables small group conversations beyond one-on-one meetings, fostering collaborative discussions and expanded networking opportunities. This feature allows multiple users to join a single coffee chat session, creating a more dynamic social experience. Implementation would require significant backend complexity to manage group dynamics, handle multiple participant interactions, coordinate notifications across several users, and maintain consistent state across the group.

Online Status Indicator: Tracks and displays user presence in real-time, allowing users to see who is currently active on the platform before sending invitations. This presence tracking system would require a real-time database to continuously monitor and update each user's online status, providing visual indicators such as green dots for active users or last-seen timestamps for offline users, ultimately improving the likelihood of quick responses and successful coffee chat connections.

Requirement: Explanation of how these features fulfill the course project requirements

Deployment
This project is designed to be fully cloud-agnostic by leveraging containerization and Kubernetes orchestration. All core services: Publisher, Broker, and Subscriber—are packaged as OCI containers and deployed to any Kubernetes-compatible environment, whether on AWS, GCP, Azure, or on-prem clusters. This approach enables consistent runtime behavior, modular scaling, and portability across infrastructure providers without vendor lock-in.

Deployment follows modern GitOps best practices to ensure reliability and automation. Using FluxCD for continuous deployment, the system continuously monitors both the Git repository and container registry for new image tags. When new images are pushed, FluxCD Image Automation automatically updates Kubernetes manifests and rolls out changes without manual intervention. This guarantees traceable, version-controlled deployments with rapid iteration and zero-downtime rollouts, ensuring a robust and production-ready delivery pipeline.

The Kubernetes cluster for this project will be hosted on DigitalOcean Kubernetes (DOKS) to provide a cost-effective, developer-friendly, and reliable managed cloud environment. DigitalOcean offers built-in load balancing, automated node management, and seamless container registry integration, making it an ideal platform for scalable deployment during early development and production growth.

Monitoring and Alerting
To ensure system reliability and performance, the project incorporates comprehensive monitoring and alerting using Prometheus and Grafana within the Kubernetes cluster. Prometheus will collect real-time metrics from all microservices, including CPU/memory usage, request latencies, error rates, Redis Streams message counts, and Redis/PostgreSQL performance indicators. Custom application-level metrics will also be instrumented to track key events such as published messages, processed events, and subscriber health.

Tentative Plan
To maximize productivity, we'll divide tasks according to each team member's strengths:

Kevin (@piyoki) is primarily responsible for developing the backend services, including the Publisher, Broker, and Subscriber. In addition, he is in charge of infrastructure provisioning and deployment. Moreover, He will also handle the integration of Redis Streams for pub-sub messaging and PostgreSQL for data persistence.

Rex (@rexhanh) is primarily responsible for the frontend work and will be primarily responsible for connecting the frontend to backend services, implementing API integrations, authentication flows, and building the main UI screens and reusable components.

Cathy (@icathychen) is primarily responsible for developing backend services, including Publisher and subscriber service component. In additional, she wil also help designing and implementing the database SQL schema and relationships.

Leo (@Leo6Leo) is primarily responsible for developing the Broker service component, which acts as the message routing layer between the Publisher and Subscriber. Additionally, he will collaborate with Cathy and Kevin on the Subscriber service component.

To maintain cohesive progress, the team will hold regular meetings to address ongoing challenges and use GitHub for version control, issue tracking, and code reviews. Agile practices and early integration testing will help overcome potential challenges, especially the compatibility between backend services, notifications, and frontend components.

All team members will contribute to comprehensive documentation, including technical specifications and user guides. The team will also collectively prepare the final presentation and demo video to showcase individual contributions and highlight key project features. This plan leverages clear roles, collaboration, and efficient development practices to deliver a functional and user-friendly coffee chat booking application by the due date.