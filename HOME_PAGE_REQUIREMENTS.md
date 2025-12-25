# Home Page Workflow History — AI Prompt Brief

## Project Anchor

- Builder workflow must keep the Start → HTTP → Output happy path documented in the main README so the home page always links back to the existing DAG contract.

```
70:103:README.md
### Example DAG (Start -> HTTP -> Output)
{
  "name": "demo-jsonplaceholder",
  "version": "v1",
  "nodes": [
    {
      "id": "n_start",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {}
    },
    ...
  ],
  "edges": [
    { "id": "e1", "source": "n_start", "target": "n_http" },
    { "id": "e2", "source": "n_http", "target": "n_output" }
  ]
}
```

- The current App Router home page already renders the builder via `FlowCanvas`, `useWorkflow`, and `useExecution`; the new history view must coexist with that entry point.

```
1:34:frontend/app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { NodeConfigPanel } from "@/components/canvas/NodeConfigPanel";
import { ExecutionResult } from "@/components/execution/ExecutionResult";
import { Button } from "@/components/ui/Button";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useExecution } from "@/hooks/useExecution";
import { Node } from "@/lib/types/dag";
```

## Goals

- Show every saved workflow (stored in `workflows` table as `dag_json`) on the landing page so users can reopen or rerun flows without reconstructing them.
- Keep the existing builder flow intact: open a workflow, render the exact saved node positions, allow edits, re-validate, save, and run through Temporal.
- Provide a consistent “prompt” artifact other AI agents can consume when implementing or testing the feature.

## Functional Requirements

### Shared

1. **Identity & ordering:** Use database `id`, `name`, and `updated_at` for sorting (descending). No synthetic “version” column exists in the schema, so display labels derived from workflow metadata instead.
2. **Pagination:** Default page size 20 with `limit`/`offset` query params propagated to both FE state and the backend handler.
3. **Empty/errored states:** Dedicated components instructing the user to create the first workflow, plus retry affordances on network errors surfaced by `apiClient`.
4. **Execution badges:** If a workflow has executions, show latest status badge using backend enums (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`) plus `finished_at` when relevant.

### Frontend (Next.js 15 + React Flow 11)

1. **Home shell (`app/page.tsx`):**
   - Split layout into history list (left/top) and builder entry (right/bottom) or use tabs (History | Builder) depending on available space.
   - On mount, call `apiClient.listWorkflows({ limit, offset })`; keep responses in React state + SWR-style cache for quick tabbing.
2. **List rendering:**
   - Card/table row displays `name`, relative `updatedAt`, computed node/edge counts, latest execution status, and CTA buttons.
   - Provide CTA button set: `Edit`, `Run`, optional `View Result` (if last execution exists).
3. **Edit CTA integration:**
   - When clicking `Edit`, navigate to `/workflows/:id` or reuse current home page builder area by loading nodes via `useWorkflow.loadWorkflow(id)` and switching the panel.
   - Ensure `useWorkflow` receives full DAG (nodes + edges + positions) so canvas matches saved layout.
4. **Run CTA integration:**
   - Invoke `useExecution.runWorkflow(id)` which already drives polling via `/executions/:id`.
   - Optimistically update status badge to `RUNNING` until backend returns actual state.
5. **State + caching:**
   - Keep a local `Map<workflowId, {nodes, edges, viewport}>` so returning to edit mode uses cached coordinates and viewport (zoom/scroll) before network responses land.
   - Detect dirty state (`nodes`/`edges` diff) and warn before navigation.
6. **Accessibility / UX polish:**
   - Keyboard navigation for list rows, focus rings on CTA buttons, screen-reader labels on status badges, skeleton loaders while fetching.

#### Canvas Editing Experience

1. Use `useWorkflow.loadWorkflow(id)` to set `nodes` & `edges`; the hook already plugs into ReactFlow through `FlowCanvas` props.
2. Persist viewport per workflow (e.g., `localStorage["viewport:wf_<id>"]`). Restore values when reloading to avoid jarring jumps.
3. `NodeConfigPanel` should open automatically when double-clicking nodes from the history context so that editing flows remains seamless.
4. Validation uses `validateDAG` before save/run; surface errors inline on the home page as well as inside builder toast/snackbar.

### Backend (Go + Gin + Temporal + PostgreSQL)

1. **List endpoint (`GET /api/v1/workflows`):**
   - Accept `limit`, `offset`, optional `search` (name ILIKE).
   - Join latest execution via lateral subquery:
     ```sql
     SELECT w.id, w.name, w.dag_json, w.created_at, w.updated_at,
            e.status   AS last_status,
            e.finished_at AS last_finished_at,
            e.id       AS last_execution_id
     FROM workflows w
     LEFT JOIN LATERAL (
       SELECT id, status, finished_at
       FROM executions
       WHERE workflow_id = w.id
       ORDER BY finished_at DESC NULLS LAST
       LIMIT 1
     ) e ON true
     ORDER BY w.updated_at DESC
     LIMIT $1 OFFSET $2;
     ```
   - Respond with `{ items, total }`, where `total` is a separate `COUNT(*)` for pagination controls.
2. **Create/Update endpoints:**
   - Already implemented (`POST /api/v1/workflows`, `PUT /api/v1/workflows/:id`); ensure they update `updated_at` so history ordering stays correct.
3. **Run endpoint (`POST /api/v1/workflows/:id/run`):**
   - Reuse `ExecutionService.StartExecution` to generate execution IDs, insert into `executions`, and start Temporal workflow on `workflow-task-queue`.
   - Response shape stays `{ execution_id, workflow_id, status: "PENDING" }`.
4. **Execution endpoint (`GET /api/v1/executions/:id`):**
   - Already returns status + result. Ensure polling from home page respects same payload.
5. **Validation & logging:**
   - Continue using `pkg/dag.ValidateDAG` before persisting.
   - Add structured logs for list queries (limit/offset/query time) and run actions.

## Data & API Design

### Tables

- `workflows`
  - `id UUID PRIMARY KEY`
  - `name VARCHAR(255) NOT NULL`
  - `dag_json JSONB NOT NULL`
  - `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `executions`
  - `id UUID PRIMARY KEY`
  - `workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE`
  - `status VARCHAR(50) CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED'))`
  - `result_json JSONB`
  - `error TEXT`
  - `started_at TIMESTAMP NOT NULL DEFAULT NOW()`
  - `finished_at TIMESTAMP`

### API Contracts

| Route | Method | Body / Params | Response |
| --- | --- | --- | --- |
| `/api/v1/workflows` | `GET` | `limit`, `offset`, `search` | `{ items: WorkflowSummary[], total: number }` |
| `/api/v1/workflows` | `POST` | `{ name, nodes, edges }` | `Workflow` |
| `/api/v1/workflows/:id` | `GET` | `id` | `Workflow` (includes `dag_json` parsed) |
| `/api/v1/workflows/:id` | `PUT` | `{ name, nodes, edges }` | `Workflow` |
| `/api/v1/workflows/:id/run` | `POST` | `id` | `{ execution_id, workflow_id, status }` |
| `/api/v1/executions/:id` | `GET` | `id` | `Execution` |

`WorkflowSummary` augments the existing workflow payload with:

```json
{
  "id": "wf_123",
  "name": "demo-jsonplaceholder",
  "updatedAt": "2025-12-15T10:00:00Z",
  "nodeCount": 3,
  "edgeCount": 2,
  "lastExecution": {
    "id": "exec_456",
    "status": "COMPLETED",
    "finishedAt": "2025-12-15T10:05:00Z"
  }
}
```

## UX Flow

1. **Load:** User lands on `/` → list component fetches workflows, builder idle.
2. **Select for edit:** Clicking `Edit` loads DAG, restores viewport, opens builder; user tweaks nodes/edges and saves via existing CTA.
3. **Run from history:** Clicking `Run` saves if dirty, then calls `/run`, kicks off polling, and updates badge inline.
4. **View execution:** When polling hits `COMPLETED`/`FAILED`, allow quick navigation to `ExecutionResult` modal already used in builder.

## Non-Functional & Testing

- **Performance:** List API should remain <300 ms for 100 workflows (use indexes + pagination). Frontend list must not block builder interactions.
- **Resilience:** Run action retries once on Temporal transport errors before surfacing failure to the user.
- **Testing:** Add
  - FE integration tests (Playwright / React Testing Library) for list render, empty state, edit/run actions.
  - BE handler tests for new list query and search filters; service tests for latest-execution join logic.

## AI Implementation Prompt (Copy/Paste)

> You are updating the Next.js 15 frontend (`frontend/app/page.tsx`) and Go Gin backend (`backend/internal/...`) of the n8n-clone POC. Build a home-page history list that consumes `/api/v1/workflows?limit=20&offset=0`, displays workflow metadata + latest execution status, and wires `Edit` to `useWorkflow.loadWorkflow(id)` / React Flow, preserving node positions stored in `dag_json`. `Run` must call `/api/v1/workflows/:id/run` and show live status using `useExecution`. Backend must extend `GET /api/v1/workflows` to join the latest execution from the `executions` table (status enum `'PENDING','RUNNING','COMPLETED','FAILED'`). Keep existing validation, Temporal workflow queue (`workflow-task-queue`), and CORS/middleware behavior intact. Output tests/docs as needed.
