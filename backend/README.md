# n8n-clone Backend (Go + Gin + Temporal)

## Overview
Backend service for workflow DAG execution using:
- **Go + Gin** for REST API
- **Temporal** for workflow orchestration  
- **PostgreSQL** for data persistence

## Prerequisites
- Go 1.22+
- Docker & Docker Compose
- PostgreSQL client tools (optional)

## Setup

### 1. Start Infrastructure
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Temporal Server on port 7233
- Temporal UI on http://localhost:8088

### 2. Environment Variables
Copy `.env.example` to `.env` and configure:
```
DATABASE_URL=postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable
TEMPORAL_HOST=localhost:7233
API_PORT=8080
```

### 3. Run Migrations
Apply the SQL in `internal/db/migrations/001_init_schema.sql` (psql example):
```bash
psql "$DATABASE_URL" -f internal/db/migrations/001_init_schema.sql
```

### 4. Start Temporal Worker
```bash
go run cmd/worker/main.go
```

### 5. Start API Server
```bash
go run cmd/api/main.go
```

API will be available at http://localhost:8080

## API Endpoints

### Workflows
- `POST /workflows` - Create workflow
- `GET /workflows/:id` - Get workflow by ID
- `PUT /workflows/:id` - Update workflow (optional)
- `GET /workflows` - List workflows (optional)

### Executions
- `POST /workflows/:id/run` - Execute workflow
- `GET /executions/:id` - Get execution status & result
- `GET /workflows/:id/executions` - List executions (optional)

## Project Structure
```
backend/
├── cmd/
│   ├── api/            # API server entry point
│   └── worker/         # Temporal worker entry point
├── internal/
│   ├── api/            # API handlers & middleware
│   ├── db/             # Database models & migrations
│   ├── temporal/       # Temporal workflows & activities
│   └── service/        # Business logic layer
├── pkg/
│   └── dag/            # DAG validation & utilities
└── docker-compose.yml
```

## Development

### Run Tests
```bash
go test ./...
```

### Format Code
```bash
go fmt ./...
```

### Lint Code
```bash
golangci-lint run
```

## Manual Test Flow (E2E)
1) Create workflow  
```bash
curl -X POST http://localhost:8080/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sample http",
    "nodes": [
      { "id": "start-1", "type": "start", "position": {"x":0,"y":0}, "data": {} },
      { "id": "http-1", "type": "http", "position": {"x":200,"y":0}, "data": { "url": "https://httpbin.org/get", "method": "GET" } },
      { "id": "out-1", "type": "output", "position": {"x":400,"y":0}, "data": {} }
    ],
    "edges": [
      { "id": "e1", "source": "start-1", "target": "http-1" },
      { "id": "e2", "source": "http-1", "target": "out-1" }
    ]
  }'
```
2) Run workflow  
```bash
curl -X POST http://localhost:8080/api/v1/workflows/<workflowId>/run
```
3) Poll execution  
```bash
curl http://localhost:8080/api/v1/executions/<executionId>
```

## Notes
- Temporal task queue: `workflow-task-queue`
- Status lifecycle: PENDING -> RUNNING -> COMPLETED/FAILED
- Results stored in `executions.result_json`

