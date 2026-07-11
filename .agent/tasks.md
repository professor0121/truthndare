# Truth & Dare: Microservices Implementation Checklist

This checklist tracks tasks required to build the Truth & Dare platform under a **Microservices Monorepo Architecture**, transitioning from a local environment to Docker orchestration.

## Stage 1: Scaffold & Local Authentication Microservice
- [ ] **Monorepo Setup**
  - [ ] Initialize git and configure workspace setup (`pnpm-workspace.yaml` / `npm` workspaces).
  - [ ] Create `/apps/api-gateway` (NestJS REST/WebSocket server).
  - [ ] Create `/apps/user-service` (NestJS Auth database controller).
  - [ ] Create `/apps/room-service` (NestJS Room management controller).
  - [ ] Create `/apps/game-service` (NestJS Game state machine).
  - [ ] Create `/apps/question-service` (NestJS Question generation & AI).
  - [ ] Create shared package `/packages/shared` for interfaces and transport payloads.
- [ ] **Cross-Service RPC Setup**
  - [ ] Configure NestJS TCP microservice listeners on `user-service`, `room-service`, `game-service`, `question-service`.
  - [ ] Configure microservice Client proxies on `api-gateway` to communicate with downstream services.
- [ ] **Local Auth implementation (User Service)**
  - [ ] Setup ORM (Prisma or Drizzle) inside `user-service` connected to SQLite.
  - [ ] Create JWT module inside `user-service`.
  - [ ] Implement sign-up, login, guest access, and OAuth mock endpoints in `user-service`.
  - [ ] Expose an RPC verification endpoint (`verifyToken`) in `user-service` for validation by downstream services.
  - [ ] Implement JWT guard in `api-gateway` that calls `verifyToken` RPC.

## Stage 2: Room Lifecycle & Real-Time Presence
- [ ] **Room Service API**
  - [ ] Set up room database models inside `room-service` database.
  - [ ] Create RPC endpoints inside `room-service` for room creation and joining.
  - [ ] Expose REST routing in `api-gateway` calling the `room-service` proxies.
- [ ] **WebSocket Gateway Integration**
  - [ ] Setup Socket.IO gateway inside `api-gateway`.
  - [ ] Intercept WS handshakes in `api-gateway` to validate incoming JWTs via `user-service` verification RPC.
  - [ ] Event `JoinRoom`: Gateway calls `room-service` RPC to register user entrance, then joins client to Socket.IO channel and broadcasts `PlayerJoined`.
  - [ ] Event `LeaveRoom`: Broadcasts `PlayerLeft` and updates room lists.

## Stage 3: Game Engine Service (Real-Time Sync)
- [ ] **Game State Machine**
  - [ ] Model the game states (`LOBBY`, `SPINNING`, `CHOICE`, `ANSWERING`, `ENDED`) in `game-service`.
  - [ ] Configure internal client communication to forward websocket choices (like `SpinBottle` or `ChooseTruth`) from `api-gateway` to `game-service` RPC.
- [ ] **Bottle Spin Integration**
  - [ ] Host clicks "Start Game" on UI -> `api-gateway` routes request -> `game-service` begins turn logic.
  - [ ] `game-service` selects target player -> calls `api-gateway` RPC to trigger client WebSocket broadcasts.
- [ ] **Scoring and Turns**
  - [ ] `game-service` tracks answer/skip outcomes, recalculates scores, and persists to SQLite.

## Stage 4: Question & AI Service
- [ ] **Question Service Catalog**
  - [ ] Set up SQLite question dictionary in `question-service`.
  - [ ] Create RPC service endpoint in `question-service` to retrieve questions.
- [ ] **Gemini API Integration**
  - [ ] Integrate Gemini SDK in `question-service` for AI generations.
  - [ ] Implement fallback to the static dictionary if Gemini fails.
- [ ] **Safety moderation**
  - [ ] Set up prompts and filters inside `question-service` to moderate generated text.

## Stage 5: Containerization & Docker Upgrade
- [ ] **Dockerization**
  - [ ] Create distinct multi-stage `Dockerfile` files for each folder under `/apps/*`.
- [ ] **Docker Compose Orchestration**
  - [ ] Set up a `docker-compose.yml` to run the following containers:
    - [ ] `api-gateway`, `user-service`, `room-service`, `game-service`, `question-service`.
    - [ ] PostgreSQL (replacing SQLite as shared relational store).
    - [ ] Redis (for Socket.IO horizontal adapter pub-sub and active states).
- [ ] **Kafka Event Backbone**
  - [ ] Deploy Kafka in Docker Compose.
  - [ ] Set up NestJS Kafka transports for async services (`notification-service`, `leaderboard-service`).
  - [ ] Broadcast events (`TurnCompleted`, `UserRegistered`, `GameFinished`) via Kafka.
