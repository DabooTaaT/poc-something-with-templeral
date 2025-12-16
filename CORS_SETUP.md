# การตั้งค่า CORS ระหว่าง Frontend และ Backend

> **Note:** สำหรับข้อมูลเกี่ยวกับ Middleware ทั้งหมด กรุณาดูที่ [MIDDLEWARE_SETUP.md](./MIDDLEWARE_SETUP.md)

## ภาพรวม
โปรเจคนี้ได้ตั้งค่า CORS ให้ Frontend (Next.js) และ Backend (Go/Gin) สามารถสื่อสารกันได้อย่างปลอดภัย

## การตั้งค่า Backend

### 1. CORS Middleware
ไฟล์: `backend/internal/api/middleware/cors.go`

CORS middleware รองรับ:
- รายการ allowed origins จาก environment variable `CORS_ALLOWED_ORIGINS`
- Default origins: `http://localhost:3000,http://127.0.0.1:3000`
- รองรับ credentials (cookies, authorization headers)
- รองรับ HTTP methods: GET, POST, PUT, DELETE, PATCH, OPTIONS

### 2. Environment Variables
สร้างไฟล์ `.env` ใน `backend/` directory:

```env
# API Configuration
API_PORT=8080

# Database Configuration
DATABASE_URL=postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable

# Temporal Configuration
TEMPORAL_HOST=localhost:7233

# CORS Configuration (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 3. Docker Compose
ไฟล์: `backend/docker-compose.yml`

เพิ่ม API service พร้อมกับ CORS configuration:
- Port: 8080
- CORS origins กำหนดใน environment variables
- เชื่อมต่อกับ PostgreSQL และ Temporal

## การตั้งค่า Frontend

### 1. Environment Variables
สร้างไฟล์ `.env.local` ใน `frontend/` directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# Enable credentials (cookies, authorization headers)
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
```

### 2. API Client
ไฟล์: `frontend/lib/api/client.ts`

API client ตั้งค่า:
- Base URL จาก `NEXT_PUBLIC_API_URL`
- `withCredentials` เป็น `true` เพื่อส่ง cookies และ auth headers
- รองรับ error handling สำหรับ CORS และ network errors

## การรัน Development

### 1. เริ่ม Backend Services
```bash
cd backend
docker-compose up -d
```

### 2. เริ่ม Backend API (Local Development)
```bash
cd backend
# สร้าง .env ก่อน
go run cmd/api/main.go
```

### 3. เริ่ม Frontend
```bash
cd frontend
# สร้าง .env.local ก่อน
npm run dev
```

## การทดสอบ CORS

1. เปิด browser developer tools (Network tab)
2. เข้า `http://localhost:3000`
3. ทำการเรียก API (สร้าง/รัน workflow)
4. ตรวจสอบ Response Headers ควรมี:
   - `Access-Control-Allow-Origin: http://localhost:3000`
   - `Access-Control-Allow-Credentials: true`

## Production Configuration

สำหรับ Production ควรตั้งค่า:

### Backend
```env
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
```

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"
**สาเหตุ:**
- Backend ไม่ได้รัน หรือรันที่ port ไม่ถูกต้อง
- `CORS_ALLOWED_ORIGINS` ไม่มี frontend URL
- Frontend เรียก API ไปที่ URL ที่ผิด

**วิธีแก้:**
1. ตรวจสอบว่า Backend รันอยู่ที่ `http://localhost:8080`
2. ตรวจสอบ environment variable: `echo $CORS_ALLOWED_ORIGINS`
3. ถ้าเป็น `*` หรือมี URL อื่น ให้ unset: `unset CORS_ALLOWED_ORIGINS`
4. ใช้ script ที่จัดเตรียมไว้: `./scripts/dev-api.sh`

### CORS Error: "has a value 'http://localhost:8088'"
**สาเหตุ:** 
- กำลังเรียกไปที่ Temporal UI (port 8088) แทนที่จะเป็น API (port 8080)
- Environment variable `CORS_ALLOWED_ORIGINS` ถูกตั้งค่าผิด

**วิธีแก้:**
1. ตรวจสอบว่า Frontend เรียก API ที่ `http://localhost:8080` ไม่ใช่ `8088`
2. ตรวจสอบ shell environment: `env | grep CORS`
3. Unset variable ที่ผิด: `unset CORS_ALLOWED_ORIGINS`
4. Restart Backend API

### Credentials Error
**สาเหตุ:**
- ใช้ wildcard `*` กับ credentials (ซึ่งไม่ได้รับอนุญาต)
- Frontend ไม่ได้ตั้ง `withCredentials`

**วิธีแก้:**
1. ใน Frontend: ตั้ง `NEXT_PUBLIC_API_WITH_CREDENTIALS=true`
2. ใน Backend: ใช้ specific origins แทน wildcard `*`
3. Restart ทั้ง Frontend และ Backend

### Preflight Request Failed
**สาเหตุ:**
- Backend ไม่รองรับ OPTIONS method
- CORS headers ไม่ถูกส่งใน preflight response

**วิธีแก้:**
1. ตรวจสอบว่า CORS middleware ถูก register ก่อน routes
2. ตรวจสอบ logs เพื่อดู CORS decision: `[CORS] ✓ Allowed` หรือ `[CORS] ✗ Blocked`

## Development Helpers

### Quick Start Scripts

ใช้ scripts ที่จัดเตรียมไว้เพื่อความสะดวก:

**Start API Server:**
```bash
cd backend
./scripts/dev-api.sh
```

**Start Temporal Worker:**
```bash
cd backend
./scripts/dev-worker.sh
```

Scripts เหล่านี้จะ:
- ✓ ตั้ง environment variables ที่ถูกต้องอัตโนมัติ
- ✓ Unset CORS_ALLOWED_ORIGINS เพื่อใช้ค่า default
- ✓ ตรวจสอบว่า dependencies (PostgreSQL, Temporal) รันอยู่
- ✓ แสดง configuration ก่อนเริ่ม server

### Debug CORS Issues

เมื่อ Backend รันอยู่ใน debug mode จะเห็น logs:

**Startup:**
```
[CORS] Configuration loaded - Allowed origins: [http://localhost:3000 http://127.0.0.1:3000]
```

**Per Request:**
```
[CORS] ✓ Allowed: http://localhost:3000 → POST /api/v1/workflows
[CORS] ✗ Blocked: http://evil.com → GET /api/v1/workflows
```

### Check Environment

```bash
# ตรวจสอบ environment variables
env | grep -E "CORS|API_PORT|DATABASE_URL|TEMPORAL"

# ตรวจสอบว่า services รันอยู่
nc -z localhost 8080  # API
nc -z localhost 5432  # PostgreSQL  
nc -z localhost 7233  # Temporal

# ดู API logs
tail -f /path/to/api/logs
```

## Architecture Notes

### CORS Flow

1. **Browser** ส่ง preflight OPTIONS request
2. **Backend CORS Middleware** ตรวจสอบ origin
3. ถ้า allowed: ส่ง headers และ 204 response
4. ถ้า blocked: ส่ง 403 response
5. **Browser** ส่ง actual request (ถ้า preflight สำเร็จ)

### Security Best Practices

1. **Development:** ใช้ specific origins (`http://localhost:3000`)
2. **Production:** ใช้ HTTPS และ specific domains
3. **Never:** ใช้ `*` กับ credentials ใน production
4. **Always:** Validate origins server-side
5. **Always:** Use HTTPS ใน production

