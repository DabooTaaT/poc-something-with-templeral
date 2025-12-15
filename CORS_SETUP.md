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
- ตรวจสอบว่า Backend กำลังรันอยู่
- ตรวจสอบว่า `CORS_ALLOWED_ORIGINS` มี frontend URL
- ตรวจสอบว่า Frontend เรียก API ไปที่ URL ที่ถูกต้อง

### Credentials Error
- ตั้ง `NEXT_PUBLIC_API_WITH_CREDENTIALS=true` ใน frontend
- ตรวจสอบว่า Backend CORS middleware ตั้งค่า `Access-Control-Allow-Credentials: true`

### Preflight Request Failed
- ตรวจสอบว่า Backend รองรับ OPTIONS method
- ตรวจสอบว่า CORS headers ถูกส่งใน preflight response

