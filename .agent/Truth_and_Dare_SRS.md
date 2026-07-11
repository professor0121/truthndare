  
**SOFTWARE REQUIREMENTS SPECIFICATION**

**Truth & Dare**  
*Real-Time Multiplayer Social Gaming Platform*

Version 1.0  
July 2026

**Prepared by: Abhishek Kushwaha**  
Document Status: Draft for Development Planning

# **Table of Contents**

1. # **Introduction**

2. # **Overall Description**

3. # **System Features (Functional Requirements)**

4. # **External Interface Requirements**

5. # **System Architecture & Data Model Overview**

6. # **Non-Functional Requirements**

7. # **Agile Development Model**

8. # **Appendix**

# **1\. Introduction**

## **1.1 Purpose**

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for Truth & Dare, a real-time multiplayer social gaming platform. It is intended to guide the engineering team through design, implementation, and testing, and to serve as the basis for Agile sprint planning across the product's release phases.

## **1.2 Scope**

Truth & Dare allows users to create or join private game rooms, play AI-assisted Truth & Dare rounds in real time, chat with other players, track scores and leaderboards, and (in later phases) use voice and video. The system targets web (Next.js) and mobile (React Native) clients backed by a microservices architecture designed to scale to millions of concurrent users with sub-100ms latency.

In scope for this document:

* Functional requirements for all core and future-phase services

* Non-functional requirements: performance, scalability, security, availability

* External interfaces: REST, WebSocket, third-party integrations

* Data model and event definitions

* An Agile (Scrum) delivery plan mapping requirements to epics, sprints, and releases

Out of scope: detailed UI mockups, marketing/monetization strategy beyond the payment service, and infrastructure Terraform code.

## **1.3 Definitions, Acronyms, and Abbreviations**

| Term | Definition |
| :---- | :---- |
| SRS | Software Requirements Specification |
| MVP | Minimum Viable Product |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| WS | WebSocket |
| JWT | JSON Web Token |
| RTT | Round Trip Time (latency) |
| Room | A private/public game session identified by a join code |
| Turn | One player's Truth or Dare action within a game round |
| Sprint | A fixed-length (2-week) Agile development iteration |
| Epic | A large body of work that can be broken into user stories |

## **1.4 References**

* Truth & Dare System Architecture design notes (internal architecture document)

* Scrum Guide (Scrum.org / Ken Schwaber & Jeff Sutherland)

* OWASP Top 10 – Web Application Security Risks

* WebSocket Protocol RFC 6455

## **1.5 Document Overview**

Section 2 describes the product at a high level. Section 3 lists functional requirements by service. Section 4 covers external interfaces. Section 5 summarizes the system architecture and data model. Section 6 defines non-functional requirements. Section 7 presents the Agile delivery plan, including epics, backlog, and sprint-by-sprint breakdown. Section 8 contains appendices.

# **2\. Overall Description**

## **2.1 Product Perspective**

Truth & Dare is a new, standalone cloud-native platform. Clients (web and mobile) connect through an API Gateway to a set of independently deployable microservices — User, Room, Game Engine, Question, Timer, Chat, Leaderboard, Friend, Notification, Moderation, AI, Analytics, and Payment — communicating over REST, WebSocket, and gRPC. Kafka provides an event backbone for asynchronous coordination, and Redis holds fast-changing room/game state. PostgreSQL, MongoDB, and Elasticsearch serve as the primary, flexible-schema, and search data stores respectively.

## **2.2 Product Functions (Summary)**

* Account creation and login (Google, Apple, email OTP, guest)

* Create/join private or public rooms via a short room code

* Real-time turn-based Truth & Dare gameplay with a virtual bottle-spin selection

* AI-generated Truth/Dare questions with configurable category, difficulty, and language

* In-room text chat, emoji reactions, and (future) voice/video

* Turn timers, scoring, and round/game completion tracking

* Friends, invitations, and social leaderboards

* Push notifications for invites and game events

* AI-assisted content moderation to filter toxic/NSFW content

* Premium subscriptions and cosmetic purchases (Phase 3\)

## **2.3 User Classes and Characteristics**

| User Class | Description |
| :---- | :---- |
| Guest User | Plays anonymously without registration; limited feature access; session-only progress. |
| Registered User | Signed in via Google/Apple/email; has a persistent profile, coins, XP, level, and friends. |
| Room Host | Registered user who creates a room; controls room settings, start/kick/close actions. |
| Moderator/Admin | Internal role with access to moderation queues, reported content, and analytics dashboards. |

## **2.4 Operating Environment**

* Web client: Next.js (App Router), served via CDN, runs on evergreen desktop and mobile browsers.

* Mobile client: React Native (iOS 15+, Android 10+).

* Backend: NestJS microservices on Node.js, containerized with Docker, orchestrated on Kubernetes (GKE).

* Data layer: PostgreSQL (primary), Redis (cache/session/room state), MongoDB (flexible content), Elasticsearch (search/analytics).

* Third-party: Firebase Cloud Messaging, Google/Apple OAuth, Gemini/OpenAI API, Stripe, Agora/Twilio, Sentry.

## **2.5 Design and Implementation Constraints**

* Turn-taking and room state must remain consistent under concurrent WebSocket connections from all players in a room.

* AI-generated content must pass moderation checks before being shown to players.

* 18+ content categories must be gated behind explicit age confirmation and room-level opt-in.

* All service-to-service calls must be authenticated and observable (traced via OpenTelemetry).

## **2.6 Assumptions and Dependencies**

* Third-party AI providers (Gemini/OpenAI) remain available and within acceptable latency/cost bounds.

* Firebase and Agora/Twilio SLAs are sufficient for push notification and future voice/video needs.

* Initial launch targets web and Android/iOS simultaneously; voice/video is deferred to Phase 3\.

# **3\. System Features (Functional Requirements)**

## **3.1 Authentication & User Service**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-1.1 | The system shall allow login via Google OAuth, Apple Sign-In, and email OTP. | Must |
| FR-1.2 | The system shall allow anonymous guest play with a temporary profile. | Must |
| FR-1.3 | The system shall issue a JWT access token and refresh token on successful login, backed by a Redis session store. | Must |
| FR-1.4 | The system shall let users maintain a profile with name, avatar, coins, XP, and level. | Should |
| FR-1.5 | The system shall allow a guest account to convert to a registered account without losing session progress. | Could |

## **3.2 Room Service**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-2.1 | The system shall allow a host to create a room and receive a unique, human-shareable room code. | Must |
| FR-2.2 | The system shall allow players to join a room using the room code, subject to a configurable max-player limit. | Must |
| FR-2.3 | The system shall support public and private room visibility. | Must |
| FR-2.4 | The host shall be able to kick a player via a vote-kick or host-only action. | Should |
| FR-2.5 | The system shall broadcast PlayerJoined/PlayerLeft events to all room members in real time. | Must |
| FR-2.6 | The system shall automatically close a room after a configurable period of host inactivity. | Could |

## **3.3 Game Engine**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-3.1 | The system shall randomly select the starting player and cycle turns in order. | Must |
| FR-3.2 | The system shall implement a bottle-spin animation/selection mechanic to choose the active player. | Should |
| FR-3.3 | The system shall let the active player choose Truth or Dare each turn. | Must |
| FR-3.4 | The system shall record each turn's outcome (Completed/Skipped) and time taken. | Must |
| FR-3.5 | The system shall update and persist player scores after each turn. | Must |
| FR-3.6 | The system shall determine and broadcast a winner when the game ends. | Must |

## **3.4 Question Service & AI Integration**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-4.1 | The system shall serve Truth/Dare questions filtered by type, difficulty, category, and language. | Must |
| FR-4.2 | The system shall generate novel Truth/Dare questions via an AI provider (Gemini/OpenAI) on demand. | Should |
| FR-4.3 | AI-generated questions shall pass through the Moderation Service before being shown to players. | Must |
| FR-4.4 | The system shall support 18+ category questions only in rooms where all players have opted in. | Must |
| FR-4.5 | The system shall allow players to like/favorite a question for reuse. | Could |

## **3.5 Timer Service**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-5.1 | The system shall run a per-turn countdown timer synchronized across all clients in a room. | Must |
| FR-5.2 | The system shall auto-skip a turn when the timer expires without a completed answer. | Should |
| FR-5.3 | The system shall broadcast TimerUpdated events at a fixed interval to keep clients in sync. | Must |

## **3.6 Chat & Social Interaction**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-6.1 | The system shall support real-time text chat within a room. | Must |
| FR-6.2 | The system shall support emoji reactions during gameplay. | Should |
| FR-6.3 | Chat messages shall pass through the Moderation Service for toxicity/NSFW filtering. | Must |
| FR-6.4 | The system shall support voice chat rooms in a future phase (Phase 3). | Could |
| FR-6.5 | The system shall support video rooms in a future phase (Phase 3). | Could |

## **3.7 Leaderboard & Friend Service**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-7.1 | The system shall maintain a per-room and global leaderboard ranked by score/XP. | Must |
| FR-7.2 | The system shall allow users to send, accept, and remove friend requests. | Should |
| FR-7.3 | The system shall allow users to invite friends directly into a room. | Should |
| FR-7.4 | Leaderboard reads shall be served from a Redis cache with periodic recomputation. | Must |

## **3.8 Notification Service**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-8.1 | The system shall send push notifications for game invites via Firebase Cloud Messaging. | Must |
| FR-8.2 | The system shall publish notification-triggering events to Kafka for async delivery. | Must |
| FR-8.3 | Users shall be able to configure notification preferences. | Could |

## **3.9 Moderation Service**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-9.1 | The system shall automatically flag and remove toxic or NSFW-generated content. | Must |
| FR-9.2 | The system shall let players report inappropriate chat messages or questions. | Should |
| FR-9.3 | The system shall provide an admin queue for reviewing flagged content. | Should |

## **3.10 Payment Service (Phase 3\)**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-10.1 | The system shall support premium subscription purchases via Stripe. | Could |
| FR-10.2 | The system shall support cosmetic item purchases (avatars, themes) using in-app coins. | Could |
| FR-10.3 | The system shall log all payment transactions for audit purposes. | Must (when payments enabled) |

## **3.11 Analytics Service**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR-11.1 | The system shall record gameplay events (joins, turns, completions) for product analytics. | Should |
| FR-11.2 | The system shall expose aggregate dashboards (DAU, session length, retention) to internal stakeholders. | Should |

# **4\. External Interface Requirements**

## **4.1 User Interfaces**

The web client (Next.js App Router) and mobile client (React Native) shall share consistent visual design and interaction patterns across Lobby, Game Room, Profile, Friends, Leaderboard, Settings, and Admin modules. UI state is managed with React Query (server state), Zustand (client state), and a dedicated WebSocket store.

## **4.2 Hardware Interfaces**

No dedicated hardware is required beyond standard consumer smartphones, tablets, and desktop/laptop browsers with camera/microphone access for future voice/video features.

## **4.3 Software Interfaces**

| Integration | Purpose |
| :---- | :---- |
| Google OAuth / Apple Sign-In | User authentication |
| Firebase Cloud Messaging | Push notifications |
| Gemini / OpenAI API | AI-generated Truth & Dare questions, content moderation assist |
| Stripe | Subscription and in-app purchase processing |
| Agora / Twilio | WebRTC-based voice and video (Phase 3\) |
| Sentry | Error tracking and crash reporting |

## **4.4 Communication Interfaces**

### **REST / GraphQL**

Used for non-real-time operations: authentication, profile management, question catalog browsing, friend management, and payment processing.

### **WebSocket Events**

| Direction | Event | Purpose |
| :---- | :---- | :---- |
| Client → Server | JoinRoom / LeaveRoom | Enter or exit a room |
| Client → Server | StartGame | Host starts the game session |
| Client → Server | SpinBottle | Trigger player-selection animation |
| Client → Server | ChooseTruth / ChooseDare | Select turn type |
| Client → Server | Answer / Skip | Complete or skip the current turn |
| Client → Server | VoteKick / Emoji / Chat | Social/moderation actions during play |
| Server → Client | PlayerJoined / PlayerLeft | Room membership changes |
| Server → Client | TurnStarted / QuestionGenerated | New turn begins with a question |
| Server → Client | TimerUpdated | Synchronized countdown tick |
| Server → Client | RoundCompleted / Winner / GameEnded | Game progress and completion |
| Server → Client | ChatMessage / Notification | Real-time messaging and alerts |

### **Service-to-Service**

Internal microservices communicate via gRPC for low-latency synchronous calls and Kafka topics (PlayerJoined, TurnCompleted, GameFinished, NotificationSent, etc.) for asynchronous, event-driven coordination.

# **5\. System Architecture & Data Model Overview**

## **5.1 Architecture Summary**

Traffic enters through Cloudflare CDN/WAF and a Google load balancer, then an API Gateway that fronts REST, WebSocket, and GraphQL entry points. Twelve microservices — User, Room, Game Engine, Question, Timer, Leaderboard, Friend, Notification, Chat, Moderation, AI, Analytics, and Payment — run behind a service mesh, communicate over gRPC/REST, and publish domain events to Kafka. PostgreSQL is the system of record; Redis holds ephemeral room/turn/session state and caches; MongoDB stores flexible content such as questions; Elasticsearch powers search and analytics; object storage holds media assets.

## **5.2 Core Data Entities**

| Entity | Key Fields |
| :---- | :---- |
| User | id, name, avatar, coins, xp, level, email, createdAt |
| Room | id, code, hostId, maxPlayers, visibility, status, createdAt |
| RoomPlayer | id, roomId, userId, score, isHost, joinedAt |
| Question | id, type (Truth/Dare), difficulty, category, text, likes, language |
| Game | id, roomId, currentPlayer, round, status, winner |
| Turn | id, gameId, playerId, questionId, type, timeTaken |

## **5.3 Redis Usage**

* Live room state and current-turn pointer

* Per-turn timer state

* Online-player presence

* Session/token cache

* API rate limiting

* Leaderboard cache (sorted sets)

# **6\. Non-Functional Requirements**

## **6.1 Performance**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| NFR-1.1 | 95th-percentile WebSocket event round-trip latency shall remain below 100ms under normal load. | Must |
| NFR-1.2 | Room join and game-start actions shall complete within 500ms end-to-end. | Must |

## **6.2 Scalability**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| NFR-2.1 | All API and WebSocket services shall be stateless and horizontally auto-scalable on Kubernetes. | Must |
| NFR-2.2 | The system shall support millions of concurrent users through Redis caching, Kafka-based decoupling, and read replicas. | Must |

## **6.3 Security**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| NFR-3.1 | All client-server traffic shall be encrypted via HTTPS/WSS. | Must |
| NFR-3.2 | The system shall enforce JWT-based authentication on both REST and WebSocket connections. | Must |
| NFR-3.3 | The system shall apply rate limiting, input validation, Helmet headers, CSRF and XSS protections, and parameterized queries to prevent injection attacks. | Must |
| NFR-3.4 | Secrets shall be stored in a managed secrets manager, never in source control. | Must |
| NFR-3.5 | Security-relevant actions shall be written to an audit log. | Should |

## **6.4 Availability & Reliability**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| NFR-4.1 | Core gameplay services shall target 99.9% monthly uptime. | Should |
| NFR-4.2 | The system shall degrade gracefully (e.g., disable AI question generation) if a third-party dependency is unavailable, rather than failing the whole game session. | Must |

## **6.5 Usability & Accessibility**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| NFR-5.1 | The UI shall be responsive across mobile and desktop breakpoints. | Must |
| NFR-5.2 | The UI shall meet WCAG 2.1 AA color-contrast and keyboard-navigation guidelines where feasible. | Should |

## **6.6 Maintainability & Observability**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| NFR-6.1 | Each microservice shall be independently deployable via Docker/Kubernetes with its own CI/CD pipeline. | Must |
| NFR-6.2 | The system shall expose metrics, logs, and traces via Prometheus, ELK, and OpenTelemetry/Jaeger, with error tracking in Sentry. | Must |

# **7\. Agile Development Model**

## **7.1 Methodology Overview**

Delivery shall follow Scrum with two-week sprints, a single cross-functional team (or team-per-domain as headcount grows), and the standard ceremonies: Sprint Planning, Daily Standup, Sprint Review/Demo, and Sprint Retrospective. The Product Backlog is derived directly from the functional requirements in Section 3, grouped into Epics aligned with the three release phases already defined in the architecture roadmap (MVP, Phase 2, Phase 3).

## **7.2 Roles**

| Role | Responsibility |
| :---- | :---- |
| Product Owner | Owns and prioritizes the backlog; accepts completed stories against acceptance criteria. |
| Scrum Master | Facilitates ceremonies, removes blockers, protects the team's focus. |
| Development Team | Frontend (Next.js/React Native), Backend (NestJS microservices), DevOps/SRE. |
| QA | Writes and executes test plans; owns regression and load testing for real-time flows. |

## **7.3 Epics (Backlog Grouping)**

| Epic | Related Requirements |
| :---- | :---- |
| EPIC-1: Authentication & Onboarding | FR-1.1 – FR-1.5 |
| EPIC-2: Room Management | FR-2.1 – FR-2.6 |
| EPIC-3: Core Game Engine | FR-3.1 – FR-3.6 |
| EPIC-4: Question Catalog & AI Generation | FR-4.1 – FR-4.5 |
| EPIC-5: Turn Timer & Real-Time Sync | FR-5.1 – FR-5.3 |
| EPIC-6: Chat & Social Interaction | FR-6.1 – FR-6.5 |
| EPIC-7: Leaderboard & Friends | FR-7.1 – FR-7.4 |
| EPIC-8: Notifications | FR-8.1 – FR-8.3 |
| EPIC-9: Moderation & Trust/Safety | FR-9.1 – FR-9.3 |
| EPIC-10: Monetization | FR-10.1 – FR-10.3 |
| EPIC-11: Analytics & Insights | FR-11.1 – FR-11.2 |

## **7.4 Release Plan**

The roadmap is organized into three releases, each broken into two-week sprints. Story points use a Fibonacci-like scale (1, 2, 3, 5, 8, 13).

### **Release 1 — MVP (Sprints 0–5, \~10–12 weeks)**

| Sprint | Sprint Goal | Key User Stories | Pts |
| :---- | :---- | :---- | :---- |
| Sprint 0 | Project setup | Repo/monorepo scaffold, CI/CD, K8s base manifests, NestJS \+ Next.js skeletons, Kafka/Redis/Postgres provisioning | 13 |
| Sprint 1 | Auth foundation | As a user I can sign up/log in with Google, Apple, or email OTP; As a user I can play as a guest (FR-1.1–1.3) | 13 |
| Sprint 2 | Room lifecycle | As a host I can create a room and get a code; As a player I can join via code; room presence events (FR-2.1–2.5) | 13 |
| Sprint 3 | Core game loop I | As a host I can start a game; player order and bottle-spin selection; Truth/Dare choice (FR-3.1–3.3) | 13 |
| Sprint 4 | Core game loop II | Turn completion/skip, scoring, winner determination, per-turn timer (FR-3.4–3.6, FR-5.1–5.3) | 13 |
| Sprint 5 | MVP hardening | Static question catalog (FR-4.1), in-room chat (FR-6.1), basic moderation filter (FR-9.1), bug bash, load test | 13 |

### **Release 2 — Social & AI (Sprints 6–10, \~10 weeks)**

| Sprint | Sprint Goal | Key User Stories | Pts |
| :---- | :---- | :---- | :---- |
| Sprint 6 | Friends & invites | As a user I can add friends and invite them to a room (FR-7.2–7.3) | 8 |
| Sprint 7 | Leaderboards | Global and per-room leaderboards backed by Redis sorted sets (FR-7.1, FR-7.4) | 8 |
| Sprint 8 | AI question generation | As a player I can request AI-generated Truth/Dare questions by category/difficulty (FR-4.2, FR-4.4) | 13 |
| Sprint 9 | AI moderation pipeline | AI-generated and chat content is screened before display (FR-4.3, FR-9.1–9.3) | 13 |
| Sprint 10 | Notifications & polish | Push notifications for invites/turns via Firebase (FR-8.1–8.3), UX polish | 8 |

### **Release 3 — Voice/Video, Monetization & Scale (Sprints 11–16, \~12 weeks)**

| Sprint | Sprint Goal | Key User Stories | Pts |
| :---- | :---- | :---- | :---- |
| Sprint 11 | Voice chat | As a player I can join a voice channel during a game via Agora/Twilio (FR-6.4) | 13 |
| Sprint 12 | Video rooms | As a player I can enable video during gameplay (FR-6.5) | 13 |
| Sprint 13 | Spectator & tournament mode | As a user I can watch an ongoing game / join a bracketed tournament | 13 |
| Sprint 14 | Multi-language support | Question catalog and UI support multiple languages (FR-4.1 language field) | 8 |
| Sprint 15 | Monetization | Premium subscription and cosmetic purchases via Stripe (FR-10.1–10.3) | 13 |
| Sprint 16 | Scale & reliability | Read replicas, autoscaling policies, chaos/load testing to millions of concurrent users (NFR-2.x) | 13 |

## **7.5 Sample User Story Format**

All backlog items follow the standard story template with explicit acceptance criteria, e.g.:

* "As a Room Host, I want to start the game once all players are ready, so that gameplay begins in sync for everyone."

* Acceptance Criteria: Start is disabled until minimum player count is met; StartGame event is broadcast to all clients within 200ms; server randomly selects the first player and emits TurnStarted.

## **7.6 Definition of Ready**

* Story has clear acceptance criteria and is estimated by the team

* Dependencies (APIs, events, third-party access) are identified

* Design/UX assets are attached where relevant

## **7.7 Definition of Done**

* Code merged with peer review approval and passing CI (lint, unit, integration tests)

* Acceptance criteria verified by QA, including relevant WebSocket/latency checks

* Metrics/logging/tracing added for new endpoints or events

* Deployed to staging and demoed in Sprint Review

## **7.8 Sprint Ceremonies Cadence**

| Ceremony | Frequency | Purpose |
| :---- | :---- | :---- |
| Sprint Planning | Start of each sprint | Select and commit to backlog items for the sprint |
| Daily Standup | Daily, 15 min | Sync progress and surface blockers |
| Backlog Refinement | Mid-sprint | Groom and estimate upcoming stories |
| Sprint Review / Demo | End of sprint | Demonstrate completed increment to Product Owner/stakeholders |
| Sprint Retrospective | End of sprint | Reflect on process and identify improvements |

# **8\. Appendix**

## **8.1 Technology Stack**

| Layer | Technology |
| :---- | :---- |
| Frontend | Next.js (App Router), React, TypeScript |
| Mobile | React Native |
| Backend | NestJS (Node.js), TypeScript |
| Real-time | Socket.IO / native WebSockets |
| API | REST \+ gRPC (service-to-service) |
| Database | PostgreSQL |
| Cache | Redis |
| Event Streaming | Apache Kafka |
| Search | Elasticsearch |
| Object Storage | Google Cloud Storage / Amazon S3 |
| Authentication | Google OAuth, Apple Sign-In, JWT |
| AI | Gemini API |
| Push Notifications | Firebase Cloud Messaging |
| Voice/Video (future) | WebRTC via Agora or Twilio |
| Containers | Docker |
| Orchestration | Kubernetes (GKE) |
| CI/CD | GitHub Actions \+ ArgoCD |
| Infrastructure | Terraform |
| Monitoring | Prometheus, Grafana, OpenTelemetry, Sentry |

## **8.2 Revision History**

| Version | Date | Description |
| :---- | :---- | :---- |
| 1.0 | July 2026 | Initial SRS drafted from architecture notes and Agile release plan |

