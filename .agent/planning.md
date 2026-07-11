# Project Development Planning: Truth & Dare (Microservices Architecture)

This planning document outlines the phased development roadmap for **Truth & Dare**, a real-time multiplayer social gaming platform. It defines how to build the application using a **microservices monorepo**, starting with a local-first environment and upgrading to containerized database and messaging clusters.

---

## 1. Monorepo & Microservices Directory Structure

To support a true microservices architecture, the codebase is structured as a monorepo:

```text
/tnd
  ├── apps/
  │    ├── api-gateway/         # Public Gateway (REST Routing & WebSocket Gateway)
  │    ├── user-service/        # Auth, JWT, user accounts, and guest sessions
  │    ├── room-service/        # Room state management and presence tracking
  │    ├── game-service/        # Core game state transitions, turns, and scoring
  │    └── question-service/    # Question dictionary, Gemini AI, and moderation
  ├── packages/
  │    ├── shared/              # Shared TS types, schemas, and custom decorators
  │    └── proto/               # Protobuf (.proto) definitions for gRPC contracts
  └── docker-compose.yml        # Development infrastructure container orchestration
```

---

## 2. Microservice Coordination & Protocols

For high scalability and low latency, we structure communication channels as follows:

1. **North-South Traffic (Public Clients → Gateway)**:
   - **REST/HTTP**: Standard client CRUD operations (sign-up, fetching profile info, etc.) go to the `api-gateway` on port `3000`. The gateway routes requests downstream.
   - **WebSockets (Socket.IO)**: The `api-gateway` acts as the primary WebSocket server. It terminates WS connections, handles client handshakes, validates JWTs, and emits interior events to downstream services.
2. **East-West Traffic (Internal Service-to-Service)**:
   - **Synchronous RPC**: We use **gRPC** (or NestJS **TCP** transport for simplicity in Stage 1) for low-overhead internal calls. For example, when a user attempts to create a room, the `room-service` makes an RPC request to `user-service` to verify active host user state.
   - **Asynchronous Messaging**: We use **Kafka** (Stage 5) to broadcast global system events (e.g. `TurnCompleted`, `GameFinished`, `UserRegistered`). Downstream services like the Notification, Leaderboard, and Analytics services consume these events asynchronously.

---

## 3. Phased Microservices Roadmap

### Stage 1: Monorepo Scaffold & Local Auth
- **Goal**: Build the workspace framework, scaffold services, and implement microservices-based authentication.
- **Scaffolding**: Establish a workspace (pnpm/npm). Scaffold NestJS for all services under `/apps/*`.
- **Local Authentication**:
  - Implemented inside `user-service`. Uses JWT-based authorization.
  - Exposes local Email/Password registration/login, and Guest access.
  - Gateway routes `/auth/*` directly to `user-service`.
  - Microservices intercept client JWTs via standard authentication filters that verify tokens against the `user-service` over RPC.

### Stage 2: Room Lifecycle & Real-Time Presence
- **Goal**: Enable room operations and track real-time socket connections.
- **Room API**: Expose REST endpoints in `room-service` for room CRUD, routed via API Gateway.
- **WebSocket Gateway**:
  - `api-gateway` runs Socket.IO.
  - When a client connects with a JWT, the Gateway validates it with the `user-service` RPC.
  - WebSocket events (`JoinRoom`, `LeaveRoom`) are parsed in the gateway and proxied to `room-service` via RPC to verify room codes and update participant counts.
  - Gateway broadcasts `PlayerJoined` and `PlayerLeft` to other players in the Socket.IO room.

### Stage 3: Game Engine Service
- **Goal**: Track turn sequences, spin transitions, and scoring.
- **Engine Logic**:
  - Built inside `game-service`. Runs a state machine for turn cycles.
  - Synchronizes choices: `game-service` RPC tells `api-gateway` to broadcast bottle spin visual actions, active selection steps, and prompt choices to room sockets.

### Stage 4: Question & AI Service
- **Goal**: Serve questions and leverage the Gemini API.
- **Data Fetching**: `question-service` maintains the MongoDB/SQLite question store.
- **Gemini SDK**: Integrated into `question-service` to generate prompts on demand. If the prompt fails, it returns a static question.
- **Content Filter**: A microservices moderation module within `question-service` screens generated content.

### Stage 5: Containerization & Cloud Deployment (Docker Phase)
- **Goal**: Dockerize each individual microservice and connect full data pipelines.
- **Dockerization**: A Dockerfile is written for each service.
- **Infrastructure Upgrade**:
  - Transition local state variables to a shared **Redis** container (for fast caching of room state and WebSocket sync adapters).
  - Deploy **PostgreSQL** inside a container.
  - Spin up **Kafka** to handle inter-service decoupled event broadcasts.

---

## 4. Microservices Communication Stack

| Phase | Internal Synchronous RPC | Ephemeral Cache & State | Async Event Broker |
| :--- | :--- | :--- | :--- |
| **Local Phase (Stages 1–4)** | NestJS TCP Transport / gRPC | Local In-Memory / SQLite | Node.js EventEmitters (Mock) |
| **Docker Phase (Stage 5)** | Production gRPC Protocols | Containerized Redis Cache | Docker-Compose Kafka Cluster |
