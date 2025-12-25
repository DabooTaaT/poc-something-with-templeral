# n8n-clone POC - Project Structure

This document provides an overview of the complete project structure after initialization.

## Repository Overview

```
poc/
├── backend/               # Go backend with Gin + Temporal + PostgreSQL
├── frontend/              # Next.js frontend with React Flow
├── PROMPT_AI.md          # AI prompts for scaffolding
├── BE_PROMPT.md          # Backend detailed specifications
├── FE_PROMPT.md          # Frontend detailed specifications
├── PROJECT_STRUCTURE.md  # This file
└── README.md             # Main project README
```

## Backend Structure

```
backend/
├── cmd/
│   ├── api/
│   │   └── main.go                    # API server entry point ✅
│   └── worker/
│       └── main.go                    # Temporal worker entry point ✅
├── internal/
│   ├── api/
│   │   ├── handlers/
│   │   │   ├── workflow.go           # Workflow CRUD handlers ✅
│   │   │   └── execution.go          # Execution handlers ✅
│   │   └── middleware/
│   │       └── cors.go                # CORS middleware ✅
│   ├── db/
│   │   ├── models/
│   │   │   ├── workflow.go           # Workflow model ✅
│   │   │   └── execution.go          # Execution model ✅
│   │   └── migrations/
│   │       └── 001_init_schema.sql   # Database schema ✅
│   ├── temporal/
│   │   ├── workflow.go                # Temporal workflow definition ✅
│   │   └── activities.go             # Temporal activities ✅
│   └── service/
│       ├── workflow_service.go        # (TODO)
│       └── execution_service.go       # (TODO)
├── pkg/
│   └── dag/
│       └── validation.go              # DAG validation logic ✅
├── docker-compose.yml                 # Docker services config ✅
├── go.mod                             # Go dependencies ✅
├── go.sum                             # Go dependency checksums ✅
└── README.md                          # Backend documentation ✅
```

## Frontend Structure

```
frontend/
├── app/
│   ├── layout.tsx                     # Root layout ✅
│   └── page.tsx                       # Main page with placeholder ✅
├── components/
│   ├── canvas/                        # (TODO: FlowCanvas, CustomNodes, NodeConfigPanel)
│   ├── ui/                            # (TODO: Button, Modal, etc.)
│   └── execution/                     # (TODO: ExecutionResult)
├── hooks/
│   ├── useWorkflow.ts                 # Workflow state management ✅
│   └── useExecution.ts                # Execution state management ✅
├── lib/
│   ├── dag/
│   │   └── validation.ts              # DAG validation ✅
│   ├── api/
│   │   └── client.ts                  # API client ✅
│   └── types/
│       └── dag.ts                     # TypeScript types ✅
├── public/                            # Static assets ✅
├── package.json                       # Dependencies ✅
├── tsconfig.json                      # TypeScript config ✅
├── next.config.ts                     # Next.js config ✅
├── tailwind.config.ts                 # Tailwind config ✅
└── README.md                          # Frontend documentation ✅
```

## Initialization Status

### ✅ Completed
- Backend folder structure created
- Go module initialized with all dependencies
- Docker Compose configuration for PostgreSQL, Temporal Server, and Temporal UI
- Database models and migration SQL
- DAG validation utilities (basic implementation)
- Temporal workflow and activities (scaffolded)
- API handlers for workflow and execution (scaffolded)
- API server and worker entry points
- Frontend Next.js project initialized
- Frontend dependencies installed (React Flow, Axios, etc.)
- TypeScript types for DAG structures
- DAG validation logic (cycle detection, connectivity checks)
- API client for backend communication
- Custom hooks (useWorkflow, useExecution)
- Basic placeholder UI

### 🚧 To Implement

#### Backend
1. Service layer (workflow_service.go, execution_service.go)
2. Complete DAG validation (topological sort, full cycle detection)
3. Database connection and query implementation
4. Temporal client integration in API handlers
5. Complete workflow execution logic in Temporal workflow
6. Error handling and logging
7. Unit tests
8. Integration tests

#### Frontend
1. React Flow canvas component (FlowCanvas.tsx)
2. Custom node components (StartNode, HttpNode, OutputNode)
3. Node configuration panel (NodeConfigPanel.tsx)
4. Execution result display (ExecutionResult.tsx)
5. UI components (Button, Modal, Toast)
6. Complete validation UI feedback
7. Styling improvements
8. Tests

## Getting Started

### 1. Start Backend Infrastructure

```bash
cd backend
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Temporal Server on port 7233
- Temporal UI on http://localhost:8088

### 2. Run Database Migrations

```bash
# Manually run SQL from internal/db/migrations/001_init_schema.sql
# Or implement migration tool
```

### 3. Start Backend Services

Terminal 1 - API Server:
```bash
cd backend
go run cmd/api/main.go
```

Terminal 2 - Temporal Worker:
```bash
cd backend
go run cmd/worker/main.go
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable
TEMPORAL_HOST=localhost:7233
API_PORT=8080
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Next Steps

Refer to `PROMPT_AI.md` for AI prompts to continue implementation:
- Backend: Complete TODO items in workflow execution, database integration
- Frontend: Implement React Flow canvas and custom components

For detailed specifications, see:
- `BE_PROMPT.md` - Backend task breakdown
- `FE_PROMPT.md` - Frontend task breakdown

