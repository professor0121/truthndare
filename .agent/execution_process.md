# Truth & Dare: Development Execution Process (Microservices)

This document provides step-by-step instructions to scaffold, configure, run, and scale the Truth & Dare platform using a **Microservices Monorepo**.

---

## 1. Monorepo Setup & Scaffolding

Run these commands to establish the monorepo workspace:

```bash
# Initialize root package manager (pnpm recommended)
pnpm init

# Scaffold the API Gateway (Public-facing Router & WebSocket Gateway)
mkdir -p apps/api-gateway
cd apps/api-gateway
npx -y @nestjs/cli new . --package-manager pnpm --skip-git
cd ../..

# Scaffold the User/Auth Microservice
mkdir -p apps/user-service
cd apps/user-service
npx -y @nestjs/cli new . --package-manager pnpm --skip-git
cd ../..

# Scaffold the Room Microservice
mkdir -p apps/room-service
cd apps/room-service
npx -y @nestjs/cli new . --package-manager pnpm --skip-git
cd ../..

# Scaffold the Game Engine Microservice
mkdir -p apps/game-service
cd apps/game-service
npx -y @nestjs/cli new . --package-manager pnpm --skip-git
cd ../..

# Scaffold the Question/AI Microservice
mkdir -p apps/question-service
cd apps/question-service
npx -y @nestjs/cli new . --package-manager pnpm --skip-git
cd ../..
```

Define a root `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## 2. Microservice Port & Communication Mapping

To avoid conflicts during local execution, configure different ports for each microservice:

| Service | Public Port | Internal Microservice Transport Port | Type |
| :--- | :--- | :--- | :--- |
| **`api-gateway`** | `3000` (REST & WebSockets) | N/A | Gateway |
| **`user-service`** | N/A | `4001` | TCP / gRPC |
| **`room-service`** | N/A | `4002` | TCP / gRPC |
| **`game-service`** | N/A | `4003` | TCP / gRPC |
| **`question-service`**| N/A | `4004` | TCP / gRPC |

---

## 3. Environment Configuration

Create individual environment files for each app.

### API Gateway: `/apps/api-gateway/.env`
```env
PORT=3000
NODE_ENV=development

# Microservices client configurations
USER_SERVICE_HOST=localhost
USER_SERVICE_PORT=4001

ROOM_SERVICE_HOST=localhost
ROOM_SERVICE_PORT=4002

GAME_SERVICE_HOST=localhost
GAME_SERVICE_PORT=4003

QUESTION_SERVICE_HOST=localhost
QUESTION_SERVICE_PORT=4004
```

### User Service: `/apps/user-service/.env`
```env
PORT=4001
DATABASE_URL="file:./user_dev.db" # Local SQLite for User profile logs
JWT_SECRET="super_secret_local_dev_token_key"
JWT_EXPIRY="24h"
```

### Room Service: `/apps/room-service/.env`
```env
PORT=4002
DATABASE_URL="file:./room_dev.db" # Local SQLite for Active Rooms
```

### Game Service: `/apps/game-service/.env`
```env
PORT=4003
DATABASE_URL="file:./game_dev.db" # Local SQLite for Turns
```

### Question Service: `/apps/question-service/.env`
```env
PORT=4004
DATABASE_URL="file:./question_dev.db"
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```

---

## 4. Concurrent Local Execution (Local Phase)

To run all microservices concurrently without manual tabs, use `concurrently` or Turborepo in the monorepo root.

1. **Install concurrently in the root**:
   ```bash
   pnpm add -wD concurrently
   ```
2. **Add a script to root `package.json`**:
   ```json
   "scripts": {
     "dev:gateway": "pnpm --filter api-gateway run start:dev",
     "dev:user": "pnpm --filter user-service run start:dev",
     "dev:room": "pnpm --filter room-service run start:dev",
     "dev:game": "pnpm --filter game-service run start:dev",
     "dev:question": "pnpm --filter question-service run start:dev",
     "dev": "concurrently \"npm:dev:gateway\" \"npm:dev:user\" \"npm:dev:room\" \"npm:dev:game\" \"npm:dev:question\""
   }
   ```
3. **Execute local microservices stack**:
   ```bash
   pnpm run dev
   ```

---

## 5. Docker Orchestration (Docker & Production Phase)

To upgrade the stack, transition databases to PostgreSQL and Redis containers, and run all microservices containerized.

### Development `docker-compose.yml` (Databases & Messaging Only)
Use this setup to run databases containerized while running service code locally:
```yaml
version: '3.8'
services:
  # Database system of record (individual DB databases mapped per microservice)
  postgres:
    image: postgres:15-alpine
    container_name: tnd_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_password
      POSTGRES_DB: truth_dare_shared_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Shared Redis cache & WS Pub/Sub adapter
  redis:
    image: redis:7-alpine
    container_name: tnd_redis
    ports:
      - "6379:6379"

  # Kafka cluster for async cross-service notifications/event pipelines
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

volumes:
  pgdata:
```

Startup command:
```bash
docker compose up -d
```
Then redirect individual microservices `.env` databases to point to port `5432` postgres databases and port `6379` redis.
