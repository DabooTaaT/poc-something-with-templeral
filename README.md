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

### Start infra (Postgres + Temporal)
ตัวอย่าง:
```bash
docker compose up -d
```

### Run API (Go Gin)
```bash
go run ./cmd/api
```

### Run Temporal worker
```bash
go run ./cmd/worker
```

### Run Frontend (NextJS)
```bash
npm install
npm run dev
```

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

## Notes / Assumptions
- POC เน้น “ครบ flow end-to-end” มากกว่า UX
- รองรับ workflow เส้นตรงตามโจทย์เป็นขั้นต่ำ ก่อนค่อยขยายเป็น DAG หลาย branch
