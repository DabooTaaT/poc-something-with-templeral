## n8n-clone POC (React Flow + Go Gin + Temporal + Postgres)

POC นี้ทำ "workflow builder" แบบ n8n (ขั้นต่ำ) โดยใช้ **React Flow** สำหรับ canvas สร้าง DAG แล้วส่ง DAG ไปให้ฝั่ง **Go (Gin)** เพื่อ **บันทึก** และ **สั่งรัน** ผ่าน **Temporal** ตาม workflow ที่สร้างจาก frontend

### Scope (Expectation)
- **Drag & Drop component** บน canvas
- **Build flow**: `Start Node -> HTTP Node (call jsonplaceholder) -> Code Node (optional) -> Output Node`
- **Save and Run**
- **Workflow Versioning** - เก็บ version history และ restore version เก่าได้
- **Workflow History** - ดูรายการ workflows ทั้งหมดบนหน้าแรก
- **DAG file format** (สเปค + ตัวอย่าง)

### Out of scope
- Auth
- UX/UI ระดับ production

---

## Architecture (High-level)

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│                    http://localhost:3000                     │
│  - React Flow Canvas                                         │
│  - Workflow Builder UI                                      │
│  - Execution Results Display                                 │
│  - Version History Viewer                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API Server (Gin)                          │
│                   http://localhost:8080                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Handlers: Workflow, Execution                       │   │
│  │  Services: WorkflowService, ExecutionService         │   │
│  │  Middleware: CORS, Logger, Recovery                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────┬───────────────────┘
           │                               │
    ┌──────▼──────┐              ┌────────▼────────┐
    │ PostgreSQL  │              │  Temporal Server │
    │  Port: 5432 │              │   Port: 7233    │
    │             │              │                 │
    │ - workflows │              │ - Workflows     │
    │ - executions│              │ - Activities    │
    │ - versions  │              └────────┬────────┘
    └─────────────┘                       │
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

### Technology Stack

**Frontend:**
- **Next.js 15** with App Router
- **React 19** + **TypeScript 5**
- **React Flow 11** - Visual workflow canvas
- **TailwindCSS 4** - Styling
- **Axios** - HTTP client with interceptors

**Backend:**
- **Go 1.22+** - Programming language
- **Gin (gin-gonic/gin v1.11.0)** - HTTP web framework
- **PostgreSQL 16** - Database (JSONB for DAG storage)
- **Temporal SDK (v1.38.0)** - Workflow orchestration
- **lib/pq** - PostgreSQL driver

**Infrastructure:**
- **Docker + Docker Compose** - Containerization
- **Temporal Server** - Workflow execution engine
- **Temporal UI** - Workflow monitoring

---

## DAG File Format (JSON Spec)
Backend จะเก็บ workflow เป็น JSON ตามโครงนี้ (versioned)

### Schema (minimal)
- **workflow**
  - `id` (string, optional ตอน create)
  - `name` (string)
  - `version` (string) เช่น `"v1"`
  - `nodes` (array)
  - `edges` (array)
  - `createdAt`, `updatedAt` (string ISO, optional)

- **node**
  - `id` (string) unique
  - `type` (string) หนึ่งใน: `start | http | code | output`
  - `position` (object) `{ x: number, y: number }` (เพื่อ render ใน React Flow)
  - `data` (object) config ตาม node type

- **edge**
  - `id` (string) unique
  - `source` (string) node id
  - `target` (string) node id

### Node `data` by type
- **start**
  - `{}` (หรือ `{ label: "Start" }`)

- **http**
  - `url` (string) เช่น `https://jsonplaceholder.typicode.com/todos/1`
  - `method` (string) เช่น `GET`
  - `headers` (object, optional)
  - `query` (object, optional)
  - `body` (any, optional; สำหรับ POST/PUT)

- **code**
  - `code` (string, optional) - JavaScript code snippet สำหรับ transform data
  - `label` (string, optional) - Optional label
  - **Note:** ถ้า code ว่างเปล่า จะทำ passthrough (ส่งข้อมูลผ่านโดยไม่แก้ไข)
  - **Available variables:** `response` หรือ `data` (ข้อมูลจาก node ก่อนหน้า)
  - **Must return:** ค่าที่จะส่งต่อไปยัง node ถัดไป

- **output**
  - `{}` (หรือ `{ label: "Output" }`)

### Example DAG (Start -> HTTP -> Output)
```json
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
    {
      "id": "n_http",
      "type": "http",
      "position": { "x": 350, "y": 100 },
      "data": {
        "method": "GET",
        "url": "https://jsonplaceholder.typicode.com/todos/1"
      }
    },
    {
      "id": "n_output",
      "type": "output",
      "position": { "x": 600, "y": 100 },
      "data": {}
    }
  ],
  "edges": [
    { "id": "e1", "source": "n_start", "target": "n_http" },
    { "id": "e2", "source": "n_http", "target": "n_output" }
  ]
}
```

### Example DAG with Code Node (Start -> HTTP -> Code -> Output)
```json
{
  "name": "demo-with-code",
  "version": "v1",
  "nodes": [
    {
      "id": "n_start",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {}
    },
    {
      "id": "n_http",
      "type": "http",
      "position": { "x": 350, "y": 100 },
      "data": {
        "method": "GET",
        "url": "https://jsonplaceholder.typicode.com/todos/1"
      }
    },
    {
      "id": "n_code",
      "type": "code",
      "position": { "x": 600, "y": 100 },
      "data": {
        "code": "const data = response && response.data && response.data.data;\nreturn { name: data.name };"
      }
    },
    {
      "id": "n_output",
      "type": "output",
      "position": { "x": 850, "y": 100 },
      "data": {}
    }
  ],
  "edges": [
    { "id": "e1", "source": "n_start", "target": "n_http" },
    { "id": "e2", "source": "n_http", "target": "n_code" },
    { "id": "e3", "source": "n_code", "target": "n_output" }
  ]
}
```

---

## Validation Rules (ขั้นต่ำที่ควร enforce)
- **DAG only**: ห้ามมี cycle
- **Start node**: ต้องมีอย่างน้อย 1 และควรมี incoming edge = 0
- **Output node**: ต้องมีอย่างน้อย 1
- **Connectivity (ขั้นต่ำ)**: start ต้องเดินไปถึง output ได้
- **HTTP node config**: `url` ต้องไม่ว่าง, `method` default เป็น GET
- **Code node config**: `code` เป็น optional, ถ้าว่างจะทำ passthrough; ต้อง return ค่า

---

## Backend API (Contract)

### Base URL
- Development: `http://localhost:8080`
- API Prefix: `/api/v1`

### Workflow Endpoints

#### List Workflows
- `GET /api/v1/workflows?limit=20&offset=0&search=name`
- **Query Parameters:**
  - `limit` (number, optional) - จำนวน workflows ต่อหน้า (default: 20)
  - `offset` (number, optional) - offset สำหรับ pagination (default: 0)
  - `search` (string, optional) - ค้นหาตามชื่อ workflow (ILIKE)
- **Response:**
```json
{
  "items": [
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
  ],
  "total": 10
}
```

#### Create/Save Workflow
- `POST /api/v1/workflows`
- **Request body:** DAG JSON ตามสเปคด้านบน
- **Response:** `{ id: string, name: string, nodes: [...], edges: [...], createdAt: string, updatedAt: string }`

#### Get Workflow
- `GET /api/v1/workflows/:id`
- **Response:** DAG JSON พร้อม metadata

#### Update Workflow
- `PUT /api/v1/workflows/:id`
- **Request body:** DAG JSON (จะสร้าง version ใหม่อัตโนมัติ)
- **Response:** Updated workflow

#### Run Workflow
- `POST /api/v1/workflows/:id/run`
- **Response:**
```json
{
  "execution_id": "exec_123",
  "workflow_id": "wf_abc",
  "status": "PENDING"
}
```

### Execution Endpoints

#### Get Execution Status/Result
- `GET /api/v1/executions/:id`
- **Response:**
```json
{
  "id": "exec_123",
  "workflowId": "wf_abc",
  "status": "RUNNING",
  "result": null,
  "error": null,
  "startedAt": "2025-12-15T10:00:00Z",
  "finishedAt": null
}
```
- **Status values:** `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`

#### List Workflow Executions
- `GET /api/v1/workflows/:id/executions`
- **Response:** Array of executions

### Version Endpoints

#### List Workflow Versions
- `GET /api/v1/workflows/:id/versions`
- **Response:**
```json
{
  "versions": [
    {
      "id": "uuid",
      "workflowId": "uuid",
      "versionNumber": 3,
      "name": "My Workflow",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 3,
  "currentVersion": 3
}
```

#### Get Specific Version
- `GET /api/v1/workflows/:id/versions/:version`
- **Response:** Version data with nodes and edges

#### Restore Version
- `POST /api/v1/workflows/:id/restore/:version`
- **Response:** Restored workflow (version ใหม่)

### Health Check
- `GET /health`
- **Response:** `{ "status": "ok" }`

---

## Temporal Design

### Workflow (`internal/temporal/workflow.go`)
- **Input:** workflowId หรือ DAG JSON
- **Steps:**
  1. โหลด DAG (ถ้า input เป็น workflowId)
  2. ทำ topological sort เพื่อหา execution order
  3. Execute node ทีละตัวตามลำดับ โดย map `node.type` -> activity:
     - `start` → Skip (entry point)
     - `http` → `HttpRequestActivity`
     - `code` → `CodeExecutionActivity` (ถ้ามี code)
     - `output` → Store result
  4. Propagate output ของ node ก่อนหน้าไปยัง node ถัดไป
  5. Handle errors และ retry ตาม Temporal retry policy

### Activities (`internal/temporal/activities.go`)

#### HttpRequestActivity
- **Input:** `{ method, url, headers, query, body }`
- **Output:** HTTP response with status, headers, body, parsed data
- **Features:**
  - Support GET, POST, PUT, DELETE, PATCH
  - Automatic JSON parsing
  - Error handling for network failures

#### CodeExecutionActivity
- **Input:** `{ code, input }` (input = response from previous node)
- **Output:** `{ result, error }`
- **Features:**
  - JavaScript execution using goja engine
  - Sandboxed execution (5s timeout)
  - Passthrough mode if code is empty
  - Available variables: `response`, `data`
  - Must return a value

#### StoreExecutionResultActivity
- **Input:** `{ executionId, result }`
- **Output:** Success/failure
- Store execution result in PostgreSQL

---

## Database (PostgreSQL)

### Schema

#### Workflows Table
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dag_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Executions Table
```sql
CREATE TABLE executions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    result_json JSONB,
    error TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP
);

CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_started_at ON executions(started_at);
```

#### Workflow Versions Table
```sql
CREATE TABLE workflow_versions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    dag_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_id, version_number)
);

CREATE INDEX idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_versions_workflow_version ON workflow_versions(workflow_id, version_number);
```

### Data Storage
- **DAG Structure:** เก็บใน `dag_json` (JSONB) สำหรับ efficient querying
- **Execution Results:** เก็บใน `result_json` (JSONB)
- **Version History:** เก็บแต่ละ version แยกใน `workflow_versions` table

---

## Local Development

### Prerequisites
- **Node.js 20+** (แนะนำ LTS)
- **Go 1.22+**
- **Docker + Docker Compose**
- **Git**

### Quick Start (Recommended)

#### 1. Clone and Setup
```bash
# Clone repository (if applicable)
cd poc

# Install frontend dependencies
cd frontend
npm install
```

#### 2. Start Infrastructure
```bash
cd backend
docker compose up -d
```

This starts:
- PostgreSQL on port `5432`
- Temporal Server on port `7233`
- Temporal UI on port `8088`

#### 3. Run Database Migrations
```bash
cd backend
./scripts/migrate.sh
```

Or manually:
```bash
docker exec -i workflow_postgres psql -U workflow_user -d workflow_db < internal/db/migrations/001_init_schema.sql
docker exec -i workflow_postgres psql -U workflow_user -d workflow_db < internal/db/migrations/002_add_workflow_versions.sql
```

#### 4. Start Backend Services

**Using Helper Scripts (Recommended):**

```bash
cd backend

# Terminal 1: Start API Server
./scripts/dev-api.sh

# Terminal 2: Start Temporal Worker
./scripts/dev-worker.sh
```

These scripts will:
- ✓ Set all required environment variables automatically
- ✓ Use correct CORS settings for development
- ✓ Check if dependencies are running
- ✓ Display configuration before starting

**Manual Start (Alternative):**

```bash
cd backend

# Set environment variables
export DATABASE_URL="postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable"
export TEMPORAL_HOST="localhost:7233"
export API_PORT="8080"
# Important: Unset CORS_ALLOWED_ORIGINS to use defaults
unset CORS_ALLOWED_ORIGINS

# Terminal 1: API Server
go run cmd/api/main.go

# Terminal 2: Worker
go run cmd/worker/main.go
```

#### 5. Start Frontend
```bash
cd frontend
npm run dev
```

### Configuration

**Backend (.env):**
```bash
cd backend
cat > .env << EOF
API_PORT=8080
DATABASE_URL=postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable
TEMPORAL_HOST=localhost:7233
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
```

**Frontend (.env.local):**
```bash
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
NEXT_PUBLIC_API_TIMEOUT=30000
EOF
```

### Access Services
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Temporal UI:** http://localhost:8088
- **PostgreSQL:** localhost:5432

### Verify Setup
```bash
# Test API health
curl http://localhost:8080/health

# Test database connection
docker exec -it workflow_postgres psql -U workflow_user -d workflow_db -c "SELECT COUNT(*) FROM workflows;"
```

---

## Demo Flow (Expected)

### Basic Flow (Start -> HTTP -> Output)
1. เปิดหน้า canvas
2. ลาก **Start**, **HTTP**, **Output** ลงบน canvas
3. เชื่อมเส้น: `Start -> HTTP -> Output`
4. ตั้งค่า HTTP Node:
   - Method: `GET`
   - URL: `https://jsonplaceholder.typicode.com/todos/1`
5. กด **Save**
6. กด **Run**
7. เห็นผลลัพธ์ response แสดงใน Output หรือหน้า execution result

### Advanced Flow (Start -> HTTP -> Code -> Output)
1. สร้าง workflow: `Start -> HTTP -> Code -> Output`
2. ตั้งค่า HTTP Node (เหมือนด้านบน)
3. ตั้งค่า Code Node:
   ```javascript
   const data = response && response.data && response.data.data;
   return { name: data.name, title: data.title };
   ```
4. Save และ Run
5. เห็นผลลัพธ์ที่ถูก transform แล้ว

### Workflow Versioning
1. สร้างและ save workflow
2. แก้ไข workflow (เปลี่ยน URL, เพิ่ม node, etc.)
3. Save อีกครั้ง (จะสร้าง version ใหม่อัตโนมัติ)
4. เปิด Version History เพื่อดู versions ทั้งหมด
5. View version เก่า (read-only) หรือ Restore version เก่า

---

## Documentation

### Core Documentation
- **[CORS Setup Guide](./CORS_SETUP.md)** - การตั้งค่า CORS ระหว่าง Frontend และ Backend
- **[Middleware Setup Guide](./MIDDLEWARE_SETUP.md)** - รายละเอียด Middleware ทั้ง Frontend และ Backend
- **[Frontend README](./frontend/README.md)** - เอกสาร Frontend โดยละเอียด
- **[Backend README](./backend/README.md)** - เอกสาร Backend โดยละเอียด
- **[Backend Infrastructure](./backend/INFRASTRUCTURE.md)** - รายละเอียด Infrastructure และ Technology Stack

### Feature Documentation
- **[Workflow Versioning Requirements](./WORKFLOW_VERSIONING_REQUIREMENTS.md)** - ระบบ Versioning สำหรับ Workflow
- **[Code Node Requirements](./CODE_NODE_REQUIREMENTS.md)** - Code Node สำหรับ Transform Data
- **[Code Node Examples](./CODE_NODE_EXAMPLES.md)** - ตัวอย่างการใช้งาน Code Node
- **[Home Page Requirements](./HOME_PAGE_REQUIREMENTS.md)** - Workflow History บนหน้าแรก
- **[View Version Feature](./VIEW_VERSION_FEATURE.md)** - ฟีเจอร์ View Version (Read-Only)
- **[JSONPlaceholder Example](./JSONPLACEHOLDER_EXAMPLE.md)** - ตัวอย่างการใช้งาน JSONPlaceholder API

### Code Quality & Refactoring
- **[Frontend Clean Code Plan](./FRONTEND_CLEAN_CODE_PLAN.md)** - แผนการปรับปรุง Clean Code สำหรับ Frontend

#### สรุปแผนการปรับปรุง Frontend Clean Code

แผนการปรับปรุงแบ่งเป็น **5 Phases** เพื่อแก้ปัญหาหลัก:

**ปัญหาที่พบ:**
- `page.tsx` ใหญ่เกินไป (782 บรรทัด) - มี JSX มากมาย inline
- ใช้ `alert()` แทน Toast/Notification - ไม่เป็นมิตรกับผู้ใช้
- Hardcoded Configuration - node types config อยู่ใน page.tsx
- Component Structure - ยังแยกได้ดีกว่านี้
- Error Handling - ไม่สม่ำเสมอ ใช้ alert() หลายที่
- Magic Strings/Numbers - มี hardcoded values หลายที่
- Code Duplication - มี logic ที่ซ้ำกัน
- Type Safety - บางจุดใช้ `any` หรือ type assertion

**Phase 1: Extract Components & Configuration** ⭐ Priority: High
- แยก Node Types Configuration ออกจาก UI
- แยก Header Component
- แยก Sidebar Components (History, Node Palette)
- แทนที่ `alert()` ด้วย Toast/Notification system

**Phase 2: Improve State Management & Hooks** ⭐ Priority: High
- สร้าง Custom Hooks สำหรับ History Management
- ปรับปรุง Error Handling ให้สม่ำเสมอ
- สร้าง Constants File เพื่อรวม magic strings/numbers

**Phase 3: Refactor Large Files** ⭐ Priority: Medium
- แยก `page.tsx` เป็น Layout + Sections (ลดเหลือ ~100 บรรทัด)
- แยก `controller.ts` เป็น Multiple Hooks

**Phase 4: Improve Type Safety** ⭐ Priority: Medium
- สร้าง Strict Types
- สร้าง Type Guards

**Phase 5: Code Quality Improvements** ⭐ Priority: Low
- Extract Utility Functions
- สร้าง Custom Hooks สำหรับ Common Patterns

**เป้าหมายหลัง Refactoring:**
- `page.tsx`: < 150 บรรทัด (จาก 782 บรรทัด)
- Largest component: < 300 บรรทัด
- `alert()` calls: 0 (แทนที่ด้วย Toast)
- Hardcoded configs: Centralized ใน constants/
- Type safety: 100% typed, ไม่มี `any`

ดูรายละเอียดเพิ่มเติมใน [FRONTEND_CLEAN_CODE_PLAN.md](./FRONTEND_CLEAN_CODE_PLAN.md)

### Troubleshooting
- **[CORS Fix Summary](./CORS_FIX_SUMMARY.md)** - สรุปการแก้ไข CORS Issues

## Features Implemented

### Core Features
✅ **Visual Workflow Builder** - React Flow canvas with drag & drop  
✅ **Node Types:**
  - Start Node - Workflow entry point
  - HTTP Node - Make HTTP requests (GET, POST, PUT, DELETE, PATCH)
  - Code Node - Transform data with JavaScript
  - Output Node - Display execution results
✅ **Save and Load Workflows** - Persistent storage in PostgreSQL  
✅ **Execute Workflows** - Via Temporal orchestration  
✅ **Real-time Execution Results** - Live status updates and result display  
✅ **DAG Validation** - Cycle detection, connectivity checks, node validation  

### Advanced Features

#### Workflow Management
✅ **Workflow Versioning** - Automatic version creation on save  
✅ **Version History** - View all versions of a workflow  
✅ **Version Restoration** - Restore previous versions  
✅ **View Version Mode** - Read-only view of previous versions  
✅ **Workflow History** - List all workflows on home page  

#### Code Node
✅ **JavaScript Execution** - Transform data using goja engine  
✅ **Passthrough Mode** - Empty code passes data unchanged  
✅ **Error Handling** - Syntax and runtime error detection  
✅ **Timeout Protection** - 5-second execution timeout  

#### Infrastructure & Security
✅ **CORS Configuration** - Secure cross-origin communication  
✅ **Request/Response Middleware** - Enhanced logging and error handling  
✅ **Edge Middleware** - Security headers and performance optimization  
✅ **Error Handling** - User-friendly error messages  
✅ **API Interceptors** - Request/response transformation  
✅ **Timeout Management** - Configurable timeouts per operation  

#### Developer Experience
✅ **Development Scripts** - Helper scripts for easy setup  
✅ **Health Check Endpoint** - `/health` for service monitoring  
✅ **Structured Logging** - Detailed logs for debugging  
✅ **TypeScript Support** - Full type safety in frontend  

## Troubleshooting

### CORS Errors
**Symptoms:** Browser console shows CORS policy errors

**Solutions:**
1. ตรวจสอบว่า Backend กำลังรันอยู่ที่ `http://localhost:8080` (ไม่ใช่ 8088)
2. ตรวจสอบว่า `CORS_ALLOWED_ORIGINS` ใน Backend `.env` มี `http://localhost:3000`
3. ตรวจสอบว่า Frontend `.env.local` มี `NEXT_PUBLIC_API_URL=http://localhost:8080`
4. ใช้ helper script: `./scripts/dev-api.sh` (จะ unset CORS_ALLOWED_ORIGINS อัตโนมัติ)
5. ตรวจสอบ environment: `env | grep CORS` และ unset ถ้าจำเป็น
6. ดูรายละเอียดเพิ่มเติมใน [CORS_SETUP.md](./CORS_SETUP.md) และ [CORS_FIX_SUMMARY.md](./CORS_FIX_SUMMARY.md)

### Network Errors
**Symptoms:** "Network error: No response from server"

**Solutions:**
1. ตรวจสอบว่า Backend API รันอยู่: `curl http://localhost:8080/health`
2. ตรวจสอบ Browser Console สำหรับ error details
3. ตรวจสอบ Network tab ใน DevTools
4. ตรวจสอบว่า Frontend เรียก API ที่ URL ถูกต้อง

### Database Connection Errors
**Symptoms:** "Failed to connect to database" หรือ "relation does not exist"

**Solutions:**
1. ตรวจสอบว่า PostgreSQL รันอยู่: `docker ps | grep workflow_postgres`
2. เริ่ม PostgreSQL: `docker compose up -d postgres`
3. ทดสอบ connection: `docker exec -it workflow_postgres psql -U workflow_user -d workflow_db`
4. ตรวจสอบ DATABASE_URL ใน `.env`
5. Run migrations: `./scripts/migrate.sh`

### Temporal Connection Errors
**Symptoms:** "Failed to connect to Temporal"

**Solutions:**
1. ตรวจสอบว่า Temporal รันอยู่: `docker ps | grep temporal`
2. เริ่ม Temporal: `docker compose up -d temporal`
3. ตรวจสอบ TEMPORAL_HOST ใน `.env`
4. ตรวจสอบ Temporal UI: http://localhost:8088

### Code Node Execution Errors
**Symptoms:** Code execution fails หรือ timeout

**Solutions:**
1. ตรวจสอบ syntax - ไม่รองรับ optional chaining (`?.`)
2. ตรวจสอบว่า return ค่า (ต้องมี return statement)
3. ตรวจสอบว่า data structure ถูกต้อง (ใช้ `response.data.data` สำหรับ object, `response.data` สำหรับ array)
4. ดูตัวอย่างใน [CODE_NODE_EXAMPLES.md](./CODE_NODE_EXAMPLES.md)
5. ตรวจสอบ timeout (5 seconds)

### Port Already in Use
**Solutions:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or use different port
export API_PORT=8081
```

## Project Structure

```
poc/
├── backend/                    # Go backend
│   ├── cmd/
│   │   ├── api/               # API server entry point
│   │   └── worker/            # Temporal worker entry point
│   ├── internal/
│   │   ├── api/               # HTTP handlers & middleware
│   │   ├── db/                # Database models & migrations
│   │   ├── service/           # Business logic
│   │   └── temporal/          # Temporal workflows & activities
│   ├── pkg/                   # Shared packages
│   │   └── dag/               # DAG validation
│   ├── scripts/               # Development scripts
│   └── docker-compose.yml     # Infrastructure setup
├── frontend/                   # Next.js frontend
│   ├── app/                   # Next.js App Router
│   ├── components/            # React components
│   │   ├── canvas/           # Workflow canvas components
│   │   ├── execution/        # Execution result components
│   │   └── workflow/         # Workflow management components
│   ├── hooks/                 # React hooks
│   └── lib/                   # Utilities & types
└── *.md                       # Documentation files
```

## Notes / Assumptions

### Design Decisions
- **POC Focus:** เน้น "ครบ flow end-to-end" มากกว่า UX perfection
- **DAG Support:** รองรับ workflow เส้นตรงเป็นขั้นต่ำ, พร้อมขยายเป็น DAG หลาย branch
- **Production Ready:** CORS และ Middleware ถูกตั้งค่าให้พร้อม production-ready
- **Versioning:** Automatic versioning on save, manual restore
- **Code Execution:** JavaScript only (goja engine), ES5 syntax

### Limitations
- **Authentication:** ไม่มี auth system (out of scope)
- **UI/UX:** Basic UI, ไม่ได้ optimize สำหรับ production
- **JavaScript Features:** ไม่รองรับ ES6+ features บางอย่าง (เช่น optional chaining)
- **Code Node:** Timeout 5 seconds, ไม่รองรับ external libraries

### Future Enhancements (Out of Scope)
- Multiple code languages (Python, etc.)
- Version comparison (diff view)
- Workflow templates
- Scheduled workflows
- Workflow sharing/collaboration
- Advanced error recovery
- Workflow testing/debugging tools

## Contributing

1. Follow existing code structure and patterns
2. Add tests for new features
3. Update documentation
4. Follow TypeScript strict mode (frontend)
5. Follow Go best practices (backend)

## License

MIT
