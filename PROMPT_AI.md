# n8n-clone POC – Folder Structure & AI Prompts

This guide consolidates the backend (`Go + Gin + Temporal + PostgreSQL`) and frontend (`Next.js + React Flow`) scaffolding instructions. Use it to bootstrap the repository and as reusable AI prompts when delegating work.

---

## Repository Layout

```
.
├── backend/
│   ├── cmd/
│   │   ├── api/            # Gin API server entry point
│   │   └── worker/         # Temporal worker entry point
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handlers/
│   │   │   │   ├── workflow.go
│   │   │   │   └── execution.go
│   │   │   └── middleware/
│   │   ├── db/
│   │   │   ├── models/
│   │   │   │   ├── workflow.go
│   │   │   │   └── execution.go
│   │   │   └── migrations/
│   │   ├── temporal/
│   │   │   ├── workflow.go
│   │   │   └── activities.go
│   │   └── service/
│   │       ├── workflow_service.go
│   │       └── execution_service.go
│   ├── pkg/
│   │   └── dag/
│   ├── docker-compose.yml
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── canvas/
│   │   ├── ui/
│   │   └── execution/
│   ├── hooks/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js
├── PROMPT_AI.md
├── BE_PROMPT.md
└── FE_PROMPT.md
```

---

## Backend Quickstart (Go + Temporal)

**Prerequisites**

- Go 1.22+
- Docker & Docker Compose
- Temporal CLI (optional for debugging)
- PostgreSQL client tools (optional)

**Init Commands**

```bash
mkdir -p backend/{cmd/{api,worker},internal/{api/{handlers,middleware},db/{models,migrations},temporal,service},pkg/dag}
cd backend
go mod init github.com/your-org/n8n-clone
go get github.com/gin-gonic/gin github.com/google/uuid github.com/lib/pq go.temporal.io/sdk@latest github.com/joho/godotenv
```

**Docker Compose targets**

- `postgres`: `workflow_db`, user `workflow_user`, password `workflow_pass`, exposed on `5432`, persistent volume.
- `temporal`: `temporalio/auto-setup`, bound to `7233`, depends on Postgres.
- `temporal-ui`: `temporalio/ui`, exposed on `8088`, connects via `TEMPORAL_ADDRESS`.

**Key Env Vars**

| Variable        | Description                         | Default                 |
| --------------- | ----------------------------------- | ----------------------- |
| `DATABASE_URL`  | PostgreSQL DSN                      | `postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable` |
| `TEMPORAL_HOST` | Temporal server address             | `localhost:7233`        |
| `API_PORT`      | Gin HTTP port                       | `8080`                  |

### AI Prompt – Backend Scaffold

Use this when instructing an AI assistant to scaffold the backend:

```
Create Go backend folders per spec:
1. Generate docker-compose.yml with PostgreSQL (workflow_db/workflow_user/workflow_pass), Temporal server (temporalio/auto-setup, port 7233), and Temporal UI (8088). Include healthchecks and a shared network.
2. Under internal/db, add models + migrations for workflows (id UUID, name, dag_json JSONB, timestamps) and executions (status enum, result_json, error, timestamps).
3. Under pkg/dag, implement ValidateDAG, TopologicalSort, GetNodeByID with tests (cycle detection, connectivity, HTTP node config defaults).
4. In internal/temporal, define workflow.go (load DAG via activity, validate, topological order, map node types to activities) and activities.go (HTTP requests, load DAG, store/update execution status).
5. Add Gin handlers in internal/api/handlers for workflow CRUD and execution run/status, wired through services.
6. Provide cmd/api/main.go to wire DB, Temporal client, routes, middleware; cmd/worker/main.go to register workflow/activities.
Ensure go.mod references Gin, Temporal SDK, pq driver, uuid, and add clear comments for follow-up implementation.
```

---

## Frontend Quickstart (Next.js + React Flow)

**Prerequisites**

- Node.js LTS (18+)
- pnpm / npm / yarn

**Init Commands**

```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install reactflow axios react-syntax-highlighter
npx tailwindcss init -p
```

**Key Packages**

- `reactflow` for DAG canvas
- `axios` or native fetch for API client
- `tailwindcss` for styling

**Notable Directories**

- `components/canvas/FlowCanvas.tsx`, `CustomNodes.tsx`, `NodeConfigPanel.tsx`
- `components/execution/ExecutionResult.tsx`
- `lib/dag/validation.ts`, `lib/types/dag.ts`, `lib/api/client.ts`
- `hooks/useWorkflow.ts`, `hooks/useExecution.ts`

**Env Vars**

| Variable             | Description                 | Default                 |
| -------------------- | --------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL`| Backend base URL            | `http://localhost:8080` |

### AI Prompt – Frontend Scaffold

```
Set up Next.js (App Router) workflow builder:
1. Define TypeScript DAG types in lib/types/dag.ts (nodes, edges, HTTP node config).
2. Implement validation helpers in lib/dag/validation.ts (cycle detection, start/output checks, HTTP config defaults) with tests.
3. Build API client in lib/api/client.ts with create/get/update workflow + run/get execution helpers using NEXT_PUBLIC_API_URL.
4. Create React Flow canvas in components/canvas/FlowCanvas.tsx with custom nodes (start/http/output), toolbar for adding nodes, connecting edges, zoom controls, and save/run buttons.
5. Add NodeConfigPanel.tsx for method/url/headers/query/body editing, validation, and result display for output nodes.
6. Implement useWorkflow/useExecution hooks to manage DAG state, persistence, execution polling, and error handling.
7. Compose app/page.tsx to host the canvas, config panel, execution result component, toasts, and loading indicators; style with Tailwind CSS.
Ensure components are responsive, handle validation errors, and provide placeholder copy where backend integration is pending.
```

---

## Usage Tips

- Keep `PROMPT_AI.md` updated as structure evolves so downstream automation stays authoritative.
- When delegating tasks, reference specific sections (e.g., “Backend Quickstart step 3”) to keep assistants aligned.
- Combine these prompts with the detailed specifications in `BE_PROMPT.md` and `FE_PROMPT.md` for fuller context when necessary.


