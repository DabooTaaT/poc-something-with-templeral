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
```bash
# TODO: Add migration tool (e.g., golang-migrate)
# For now, manually create tables using SQL in internal/db/migrations/
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

## Next Steps
1. Implement database models and migrations
2. Implement DAG validation utilities
3. Implement Temporal workflows and activities
4. Implement API handlers
5. Add comprehensive tests

