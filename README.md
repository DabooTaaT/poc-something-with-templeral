## n8n-clone POC (React Flow + Go Gin + Temporal + Postgres)

POC นี้ทำ “workflow builder” แบบ n8n (ขั้นต่ำ) โดยใช้ **React Flow** สำหรับ canvas สร้าง DAG แล้วส่ง DAG ไปให้ฝั่ง **Go (Gin)** เพื่อ **บันทึก** และ **สั่งรัน** ผ่าน **Temporal** ตาม workflow ที่สร้างจาก frontend

### Scope (Expectation)
- **Drag & Drop component** บน canvas
- **Build flow**: `Start Node -> HTTP Node (call jsonplaceholder) -> Output Node`
- **Save and Run**
- **DAG file format** (สเปค + ตัวอย่าง)

### Out of scope
- Auth
- UX/UI ระดับ production

---

## Architecture (High-level)
- **Frontend (NextJS + React Flow)**
  - สร้าง/แก้ไข nodes + edges ให้เป็น DAG
  - Validate DAG เบื้องต้น (เช่น ห้าม cycle, ต้องมี Start, Output)
  - Save workflow ไป backend
  - Run workflow ผ่าน backend และแสดงผล execution แบบง่าย

- **Backend API (Go + Gin)**
  - CRUD ขั้นต่ำ: บันทึก/อ่าน workflow (DAG JSON)
  - Endpoint สำหรับสั่งรัน workflow
  - เก็บข้อมูลลง **PostgreSQL**

- **Temporal Worker (Go)**
  - Workflow: รับ DAG แล้ว execute ตามลำดับ (topological order)
  - Activities: อย่างน้อย `HttpRequest` และ `Store/Return Output`

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
  - `type` (string) หนึ่งใน: `start | http | output`
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

---

## Validation Rules (ขั้นต่ำที่ควร enforce)
- **DAG only**: ห้ามมี cycle
- **Start node**: ต้องมีอย่างน้อย 1 และควรมี incoming edge = 0
- **Output node**: ต้องมีอย่างน้อย 1
- **Connectivity (ขั้นต่ำ)**: start ต้องเดินไปถึง output ได้
- **HTTP node config**: `url` ต้องไม่ว่าง, `method` default เป็น GET

---

## Backend API (Contract)
หมายเหตุ: endpoint / request/response อาจปรับตาม implementation แต่ต้องคง “ความหมาย” เดิม

### Create/Save workflow
- `POST /workflows`

Request body: DAG JSON ตามสเปคด้านบน  
Response: `{ id: string }` หรือ workflow ทั้งก้อนพร้อม id

### Get workflow
- `GET /workflows/:id`

Response: DAG JSON

### Run workflow
- `POST /workflows/:id/run`

Response: `{ executionId: string }`

### Get execution status/result
- `GET /executions/:id`

Response ตัวอย่าง:
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

---

## Temporal Design (minimal)
### Workflow
- Input: workflowId หรือ DAG JSON
- Steps:
  - โหลด DAG (ถ้า input เป็น workflowId)
  - ทำ topological sort
  - execute node ทีละตัว โดย map `node.type` -> activity
  - propagate output ของ node ก่อนหน้า (อย่างน้อยสำหรับ flow เส้นตรง start->http->output)

### Activities
- `HttpRequestActivity(method, url, headers, query, body) -> response`
- `StoreExecutionResultActivity(executionId, result)` หรือ return result แล้ว backend เก็บ

---

## Database (PostgreSQL)
ตารางขั้นต่ำที่แนะนำ:
- `workflows(id, name, dag_json, created_at, updated_at)`
- `executions(id, workflow_id, status, result_json, error, started_at, finished_at)`

---

## Local Development (ตัวอย่างขั้นตอน)
โปรเจกต์นี้ตั้งใจให้รันแบบแยก 3 ส่วน:
- **frontend** (NextJS)
- **api** (Go Gin)
- **worker** (Temporal worker)
- **infra** (Postgres + Temporal server)

> หมายเหตุ: คำสั่งจริง/โฟลเดอร์จริงให้ปรับตามโครง repo ที่ implement (เช่น `apps/frontend`, `apps/api`, `apps/worker`)

### Prerequisites
- Node.js (แนะนำ LTS)
- Go 1.22+
- Docker + Docker Compose

### Configuration

**Backend (.env):**
```bash
cd backend
# สร้างไฟล์ .env
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
# สร้างไฟล์ .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
NEXT_PUBLIC_API_TIMEOUT=30000
EOF
```

### Start infra (Postgres + Temporal)
```bash
cd backend
docker compose up -d
```

### Run API (Go Gin)
```bash
cd backend
go run ./cmd/api/main.go
```

### Run Temporal worker
```bash
cd backend
go run ./cmd/worker/main.go
```

### Run Frontend (NextJS)
```bash
cd frontend
npm install
npm run dev
```

### Access Services
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Temporal UI:** http://localhost:8088
- **PostgreSQL:** localhost:5432

---

## Demo Flow (Expected)
1. เปิดหน้า canvas
2. ลาก **Start**, **HTTP**, **Output** ลงบน canvas
3. เชื่อมเส้น: `Start -> HTTP -> Output`
4. ตั้งค่า HTTP Node ให้เรียก `jsonplaceholder`
5. กด **Save**
6. กด **Run**
7. เห็นผลลัพธ์ response แสดงใน Output หรือหน้า execution result

---

## Documentation

- **[CORS Setup Guide](./CORS_SETUP.md)** - การตั้งค่า CORS ระหว่าง Frontend และ Backend
- **[Middleware Setup Guide](./MIDDLEWARE_SETUP.md)** - รายละเอียด Middleware ทั้ง Frontend และ Backend
- **[Frontend README](./frontend/README.md)** - เอกสาร Frontend โดยละเอียด
- **[Backend README](./backend/README.md)** - เอกสาร Backend โดยละเอียด

## Features Implemented

### Core Features
✅ Visual workflow builder with React Flow  
✅ Drag & drop nodes (Start, HTTP, Output)  
✅ Save and load workflows  
✅ Execute workflows via Temporal  
✅ Real-time execution results  
✅ DAG validation (no cycles, connectivity)  

### Advanced Features
✅ **CORS Configuration** - Secure cross-origin communication  
✅ **Request/Response Middleware** - Enhanced logging and error handling  
✅ **Edge Middleware** - Security headers and performance optimization  
✅ **Error Handling** - User-friendly error messages  
✅ **API Interceptors** - Request/response transformation  
✅ **Timeout Management** - Configurable timeouts per operation  

## Troubleshooting

### CORS Errors
ถ้าเจอ CORS error:
1. ตรวจสอบว่า Backend กำลังรันอยู่ที่ `http://localhost:8080`
2. ตรวจสอบว่า `CORS_ALLOWED_ORIGINS` ใน Backend `.env` มี `http://localhost:3000`
3. ตรวจสอบว่า Frontend `.env.local` มี `NEXT_PUBLIC_API_URL=http://localhost:8080`
4. ดูรายละเอียดเพิ่มเติมใน [CORS_SETUP.md](./CORS_SETUP.md)

### Network Errors
ถ้าเจอ Network error:
1. ตรวจสอบว่า Backend API รันอยู่
2. ลอง curl ทดสอบ: `curl http://localhost:8080/health`
3. ตรวจสอบ Browser Console สำหรับ error details

### Database Connection Errors
ถ้าเจอ Database error:
1. ตรวจสอบว่า PostgreSQL รันอยู่: `docker ps`
2. ทดสอบ connection: `docker exec -it workflow_postgres psql -U workflow_user -d workflow_db`
3. ตรวจสอบ DATABASE_URL ใน `.env`

## Notes / Assumptions
- POC เน้น "ครบ flow end-to-end" มากกว่า UX
- รองรับ workflow เส้นตรงตามโจทย์เป็นขั้นต่ำ ก่อนค่อยขยายเป็น DAG หลาย branch
- CORS และ Middleware ถูกตั้งค่าให้พร้อม production-ready
