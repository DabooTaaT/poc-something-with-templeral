# Backend Infrastructure Documentation

## 1. สรุป Technology Stack ที่ใช้

### Core Technologies

#### Programming Language & Runtime
- **Go 1.25.1** - Programming language สำหรับ backend development
- **Alpine Linux** - Base image สำหรับ Docker containers (lightweight)

#### Web Framework
- **Gin (gin-gonic/gin v1.11.0)** - HTTP web framework สำหรับสร้าง REST API
  - High performance HTTP router
  - Middleware support
  - JSON binding และ validation

#### Database
- **PostgreSQL 16** - Relational database management system
  - ใช้ JSONB สำหรับเก็บ DAG structure
  - Support for complex queries และ indexing
- **lib/pq (v1.10.9)** - PostgreSQL driver สำหรับ Go

#### Workflow Orchestration
- **Temporal (go.temporal.io/sdk v1.38.0)** - Distributed workflow orchestration platform
  - Reliable workflow execution
  - Activity retry และ error handling
  - Workflow state management
- **Temporal Server** - Temporal backend service
- **Temporal UI** - Web interface สำหรับ monitoring workflows

#### Utilities & Libraries
- **google/uuid (v1.6.0)** - UUID generation สำหรับ unique identifiers
- **joho/godotenv (v1.5.1)** - Environment variables management
- **go-playground/validator** - Input validation
- **goccy/go-json** - Fast JSON encoding/decoding

#### Containerization & Orchestration
- **Docker** - Containerization platform
- **Docker Compose** - Multi-container orchestration
  - Service definition และ networking
  - Volume management
  - Health checks

### Development Tools
- **Go Modules** - Dependency management
- **Database Migrations** - SQL migration scripts
- **Shell Scripts** - Development automation scripts

---

## 2. Infrastructure Architecture

### System Overview

Backend system ประกอบด้วย 2 main services:

1. **API Server** - REST API service สำหรับรับ request จาก frontend
2. **Temporal Worker** - Background worker สำหรับ execute workflows

### Infrastructure Components

#### 1. PostgreSQL Database
```yaml
Service: postgres
Image: postgres:16-alpine
Port: 5432
Container: workflow_postgres
```

**Configuration:**
- Database: `workflow_db`
- User: `workflow_user`
- Password: `workflow_pass`
- Volume: `postgres_data` (persistent storage)
- Health Check: `pg_isready` command

**Schema:**
- `workflows` table - เก็บ workflow definitions (DAG JSON)
- `executions` table - เก็บ execution history และ results
- Indexes สำหรับ performance optimization

#### 2. Temporal Server
```yaml
Service: temporal
Image: temporalio/auto-setup:latest
Port: 7233
Container: temporal
```

**Configuration:**
- Database: PostgreSQL (shared with main database)
- Dynamic Config: `temporal-dynamicconfig/development-sql.yaml`
- Health Check: `tctl workflow list` command
- Dependencies: PostgreSQL (waits for healthy state)

**Features:**
- Workflow execution engine
- Activity scheduling
- Retry policies
- State persistence

#### 3. Temporal UI
```yaml
Service: temporal-ui
Image: temporalio/ui:latest
Port: 8088 (mapped from 8080)
Container: temporal_ui
```

**Configuration:**
- Connects to Temporal server
- CORS enabled for `http://localhost:3000`
- Web interface สำหรับ:
  - View workflow executions
  - Monitor activity status
  - Debug workflow issues

#### 4. API Service (Optional Docker)
```yaml
Service: api
Build: Dockerfile.api
Port: 8080
Container: workflow_api
```

**Configuration:**
- Multi-stage build (builder + runtime)
- Base: `golang:1.22-alpine` → `alpine:latest`
- Environment variables:
  - `API_PORT=8080`
  - `DATABASE_URL` - PostgreSQL connection
  - `TEMPORAL_HOST` - Temporal server address
  - `CORS_ALLOWED_ORIGINS` - Allowed origins

**Dependencies:**
- PostgreSQL (waits for healthy state)
- Temporal (waits for healthy state)

### Network Architecture

```yaml
Network: workflow_network
Type: bridge
```

**Services in Network:**
- All services communicate through `workflow_network`
- Internal DNS resolution (service names as hostnames)
- Isolated from host network

### Volume Management

```yaml
Volumes:
  postgres_data:
    Type: Named volume
    Purpose: Persistent PostgreSQL data storage
```

**Benefits:**
- Data persistence across container restarts
- Easy backup และ restore
- Performance optimization

### Service Dependencies

```
postgres (no dependencies)
  ↓
temporal (depends on: postgres)
  ↓
temporal-ui (depends on: temporal)
  ↓
api (depends on: postgres, temporal)
```

**Health Check Strategy:**
- Services wait for dependencies to be healthy
- Prevents connection errors during startup
- Ensures proper initialization order

---

## 3. สรุป Technology Stack (Detailed)

### Application Layer

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Language | Go | 1.25.1 | Core programming language |
| Web Framework | Gin | 1.11.0 | HTTP routing และ API handling |
| Database Driver | lib/pq | 1.10.9 | PostgreSQL connectivity |
| Workflow Engine | Temporal SDK | 1.38.0 | Workflow orchestration |
| UUID Generation | google/uuid | 1.6.0 | Unique identifier generation |
| Env Management | godotenv | 1.5.1 | Environment variable loading |

### Infrastructure Layer

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Database | PostgreSQL | 16-alpine | Data persistence |
| Workflow Server | Temporal | latest (auto-setup) | Workflow execution |
| Workflow UI | Temporal UI | latest | Monitoring และ debugging |
| Containerization | Docker | - | Application packaging |
| Orchestration | Docker Compose | - | Multi-container management |

### Data Storage

| Storage Type | Technology | Usage |
|--------------|-----------|-------|
| Relational DB | PostgreSQL | Primary data store |
| JSON Storage | JSONB | DAG structure, execution results |
| Volume Storage | Docker Volumes | Persistent database data |

### Communication Protocols

| Protocol | Usage |
|----------|-------|
| HTTP/REST | API communication (Frontend ↔ Backend) |
| gRPC | Temporal internal communication |
| TCP | Database connections, Temporal server |

### Development & Deployment

| Tool | Purpose |
|------|---------|
| Go Modules | Dependency management |
| SQL Migrations | Database schema versioning |
| Shell Scripts | Development automation |
| Docker Compose | Local development environment |
| Multi-stage Dockerfile | Optimized production builds |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│                    http://localhost:3000                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API Server (Gin)                          │
│                   http://localhost:8080                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Handlers: Workflow, Execution                        │   │
│  │  Services: WorkflowService, ExecutionService          │   │
│  │  Middleware: CORS                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────┬───────────────────┘
           │                               │
           │                               │
    ┌──────▼──────┐              ┌────────▼────────┐
    │ PostgreSQL  │              │  Temporal Server │
    │  Port: 5432 │              │   Port: 7233    │
    │             │              │                 │
    │ - workflows │              │ - Workflows     │
    │ - executions│              │ - Activities    │
    └─────────────┘              └────────┬────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Temporal Worker     │
                              │  (Background)        │
                              │                     │
                              │ - Execute workflows │
                              │ - Run activities    │
                              └─────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Temporal UI        │
                              │  Port: 8088         │
                              │  (Monitoring)       │
                              └─────────────────────┘
```

---

## Service Communication Flow

### 1. Workflow Creation Flow
```
Frontend → API Server → PostgreSQL
         (POST /api/v1/workflows)
```

### 2. Workflow Execution Flow
```
Frontend → API Server → Temporal Server
         (POST /api/v1/workflows/:id/run)
                    ↓
              Temporal Worker
                    ↓
              Activities Execution
                    ↓
              PostgreSQL (store results)
```

### 3. Execution Status Flow
```
Frontend → API Server → PostgreSQL
         (GET /api/v1/executions/:id)
```

---

## Environment Configuration

### Required Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `API_PORT` | API server port | `8080` | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | Required | `postgres://user:pass@host:5432/db` |
| `TEMPORAL_HOST` | Temporal server address | `localhost:7233` | `localhost:7233` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:3000,...` | `http://localhost:3000` |

### Docker Compose Environment

Services ใช้ environment variables จาก:
- Docker Compose file (hardcoded for services)
- `.env` file (for local development)
- System environment variables

---

## Deployment Architecture

### Development Environment
- Docker Compose สำหรับ local development
- Hot reload via Go run commands
- Development scripts (`dev-api.sh`, `dev-worker.sh`)

### Production Build
- Multi-stage Dockerfile
- Optimized binary size (Alpine Linux)
- Static binary compilation (CGO_ENABLED=0)
- Health checks และ restart policies

### Scalability Considerations
- Stateless API servers (horizontal scaling)
- Temporal workers (multiple instances)
- PostgreSQL (vertical scaling หรือ replication)
- Load balancer สำหรับ API servers

---

## Security Considerations

1. **Database Security**
   - Password-protected PostgreSQL
   - SSL mode configuration
   - Network isolation (Docker network)

2. **CORS Configuration**
   - Whitelist specific origins
   - Prevents unauthorized cross-origin requests

3. **Container Security**
   - Minimal base images (Alpine)
   - Non-root user execution
   - Read-only filesystems (where possible)

---

## Monitoring & Observability

1. **Temporal UI** - Workflow execution monitoring
2. **Health Check Endpoint** - `/health` endpoint
3. **Database Logs** - PostgreSQL logs via Docker
4. **Application Logs** - Structured logging in Go

---

## Backup & Recovery

1. **Database Backups**
   - PostgreSQL volume persistence
   - Manual backup via `pg_dump`
   - Volume backup strategies

2. **Workflow State**
   - Temporal state persistence in PostgreSQL
   - Automatic recovery on restart

---

## Performance Optimization

1. **Database Indexes**
   - `idx_executions_workflow_id` - Fast workflow lookups
   - `idx_executions_status` - Status filtering
   - `idx_executions_started_at` - Time-based queries

2. **Connection Pooling**
   - Go database/sql connection pool
   - Temporal client connection management

3. **JSONB Storage**
   - Efficient JSON storage และ querying
   - Indexed JSON queries (if needed)

---

## Development Workflow

1. **Start Infrastructure**
   ```bash
   docker-compose up -d
   ```

2. **Run Migrations**
   ```bash
   ./scripts/migrate.sh
   ```

3. **Start Services**
   ```bash
   ./scripts/dev-api.sh      # Terminal 1
   ./scripts/dev-worker.sh   # Terminal 2
   ```

4. **Access Services**
   - API: http://localhost:8080
   - Temporal UI: http://localhost:8088
   - PostgreSQL: localhost:5432

---

## Summary

Backend infrastructure ใช้ modern microservices architecture ด้วย:
- **Go + Gin** สำหรับ high-performance API
- **PostgreSQL** สำหรับ reliable data storage
- **Temporal** สำหรับ distributed workflow orchestration
- **Docker Compose** สำหรับ easy development และ deployment

System design รองรับ:
- Scalability (horizontal scaling)
- Reliability (Temporal retry mechanisms)
- Observability (Temporal UI, health checks)
- Maintainability (clean architecture, separation of concerns)

