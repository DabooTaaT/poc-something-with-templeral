# Middleware Configuration - Frontend & Backend

## Overview
โปรเจคนี้มีการตั้งค่า middleware ทั้งฝั่ง Frontend และ Backend ให้ทำงานสอดคล้องกัน เพื่อให้มีการจัดการ request/response ที่มีประสิทธิภาพและปลอดภัย

---

## Backend Middleware (Go/Gin)

### 1. CORS Middleware
**ไฟล์:** `backend/internal/api/middleware/cors.go`

**Features:**
- ✅ ตรวจสอบ allowed origins จาก environment variable
- ✅ รองรับ credentials (cookies, auth headers)
- ✅ รองรับ preflight requests (OPTIONS method)
- ✅ รองรับ modern browser headers (Sec-CH-UA, etc.)
- ✅ Dynamic header reflection

**Configuration:**
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Headers Set:**
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Credentials`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Methods`
- `Vary: Origin`

### 2. Default Gin Middleware
**ไฟล์:** `backend/cmd/api/main.go`

Gin's default middleware includes:
- ✅ Logger - logs all requests
- ✅ Recovery - recovers from panics
- ✅ CORS (custom)

---

## Frontend Middleware (Next.js)

### 1. Next.js Edge Middleware
**ไฟล์:** `frontend/middleware.ts`

**Features:**
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Request logging in development
- ✅ Response timestamp header
- ✅ Runs on Edge runtime for fast performance

**Headers Set:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Response-Time`

### 2. API Client Middleware
**ไฟล์:** `frontend/lib/api/client.ts`

**Request Interceptor Features:**
- ✅ Request logging (development mode)
- ✅ Add timestamp header (`X-Request-Time`)
- ✅ Add client timezone header (`X-Client-Timezone`)
- ✅ Add standard headers (Content-Type, Accept)

**Response Interceptor Features:**
- ✅ Response logging (development mode)
- ✅ Enhanced error handling with specific messages
- ✅ Network error detection
- ✅ Status code specific error messages (400, 401, 403, 404, 500, etc.)

**Configuration:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
NEXT_PUBLIC_API_TIMEOUT=30000
```

### 3. API Middleware Utilities
**ไฟล์:** `frontend/lib/api/middleware.ts`

**Utilities:**
- ✅ `requestLogger` - Request logging utility
- ✅ `responseLogger` - Response logging utility
- ✅ `addStandardHeaders` - Add standard headers
- ✅ `errorHandler` - Normalize error responses
- ✅ `shouldRetry` - Retry logic for failed requests
- ✅ `getTimeout` - Get timeout for specific operations

---

## Middleware Flow

### Request Flow (Frontend → Backend)

```
Client Request
    ↓
Next.js Edge Middleware (security headers, logging)
    ↓
API Client Request Interceptor (add headers, logging)
    ↓
    → HTTP Request →
    ↓
Backend CORS Middleware (check origin, set headers)
    ↓
Backend Gin Logger (log request)
    ↓
Backend Handler (process request)
```

### Response Flow (Backend → Frontend)

```
Backend Handler (generate response)
    ↓
Backend Gin Logger (log response)
    ↓
Backend CORS Middleware (add CORS headers)
    ↓
    → HTTP Response →
    ↓
API Client Response Interceptor (log, error handling)
    ↓
Next.js Edge Middleware (add security headers)
    ↓
Client Response
```

---

## Matching Features Matrix

| Feature | Backend | Frontend |
|---------|---------|----------|
| **CORS Handling** | ✅ Middleware | ✅ API Client Config |
| **Request Logging** | ✅ Gin Logger | ✅ Request Interceptor |
| **Response Logging** | ✅ Gin Logger | ✅ Response Interceptor |
| **Error Handling** | ✅ Error Responses | ✅ Error Interceptor |
| **Security Headers** | ⚠️ Basic | ✅ Edge Middleware |
| **Timeout** | ✅ Server Config | ✅ API Client Config |
| **Credentials** | ✅ CORS Allow | ✅ withCredentials |
| **Custom Headers** | ✅ Allowed | ✅ Added in Interceptor |

---

## Usage Examples

### Backend - Adding New Middleware

```go
// In cmd/api/main.go
router := gin.Default()

// Add custom middleware
router.Use(middleware.CORS())
router.Use(middleware.CustomMiddleware()) // Add your new middleware
```

### Frontend - Using API Client

```typescript
// In your component
import { apiClient } from '@/lib/api/client';

// All middleware is automatically applied
const workflows = await apiClient.listWorkflows();
```

### Frontend - Custom API Call with Specific Timeout

```typescript
import { apiClient } from '@/lib/api/client';
import { getTimeout } from '@/lib/api/middleware';

// For long-running operations
const execution = await apiClient.runWorkflow(workflowId);
// Timeout is automatically set to 60s for execution operations
```

---

## Development Tips

### Debugging API Calls

1. **Enable Development Logs:**
   - Logs are automatically enabled when `NODE_ENV=development`
   - Check browser console for detailed request/response logs

2. **Check CORS Issues:**
   - Look for CORS errors in browser console
   - Verify backend `CORS_ALLOWED_ORIGINS` includes your frontend URL
   - Check Network tab for preflight (OPTIONS) requests

3. **Monitor Request Headers:**
   - Open Browser DevTools → Network tab
   - Click on any request to see headers
   - Verify headers match between frontend and backend

### Testing Middleware

```typescript
// Test error handling
try {
  await apiClient.getWorkflow('invalid-id');
} catch (error) {
  console.error(error.message); // Will show user-friendly error message
}
```

---

## Production Considerations

### Backend

1. **Restrict CORS Origins:**
   ```env
   CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

2. **Add Rate Limiting Middleware:**
   - Implement rate limiting to prevent abuse
   - Use libraries like `gin-limiter`

3. **Add Authentication Middleware:**
   - Validate JWT tokens
   - Check user permissions

### Frontend

1. **Update API URL:**
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

2. **Increase Timeout for Production:**
   ```env
   NEXT_PUBLIC_API_TIMEOUT=60000
   ```

3. **Add Error Tracking:**
   - Integrate Sentry or similar service
   - Track API errors in production

---

## Troubleshooting

### Issue: CORS Error
**Solution:**
- Verify `CORS_ALLOWED_ORIGINS` in backend `.env`
- Ensure frontend URL is included in allowed origins
- Check that backend CORS middleware is registered before routes

### Issue: Request Timeout
**Solution:**
- Increase `NEXT_PUBLIC_API_TIMEOUT` in frontend
- Check backend response time
- Verify network connectivity

### Issue: 401 Unauthorized
**Solution:**
- Ensure `NEXT_PUBLIC_API_WITH_CREDENTIALS=true`
- Verify cookies are being sent
- Check backend authentication middleware

### Issue: Network Error
**Solution:**
- Verify backend server is running
- Check API URL in frontend `.env.local`
- Test API endpoint directly with curl/Postman

---

## Summary

✅ **Backend Middleware:**
- CORS with origin validation
- Request/response logging
- Error recovery

✅ **Frontend Middleware:**
- Next.js Edge middleware for security
- API client interceptors for logging
- Enhanced error handling
- Retry logic utilities

✅ **Matching Configuration:**
- CORS settings match between frontend and backend
- Headers are properly set and validated
- Credentials support on both sides
- Consistent error handling

🚀 **Ready for Development & Production!**

