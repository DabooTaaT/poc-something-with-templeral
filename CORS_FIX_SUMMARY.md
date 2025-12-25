# CORS Issues - Analysis and Resolution

## Issue Summary

**Error Message:**
```
Access to XMLHttpRequest at 'http://localhost:8080/api/v1/workflows' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
The 'Access-Control-Allow-Origin' header has a value 'http://localhost:8088' that is not equal to the supplied origin.
```

## Root Cause Analysis

### What Was Happening

1. **Environment Variable Misconfiguration:**
   - The shell environment had `CORS_ALLOWED_ORIGINS` set to either `*` (wildcard) or `http://localhost:8088`
   - Port `8088` is the **Temporal UI**, not the API server (which is on `8080`)
   - This caused confusion between services

2. **CORS Middleware Behavior:**
   - When `CORS_ALLOWED_ORIGINS=*`, the middleware allows all origins but:
     - Cannot use credentials (cookies, auth headers)
     - May cause issues with browser security policies
   - The middleware was working but using incorrect configuration

3. **Service Port Confusion:**
   - **Port 8080**: API Server (your backend)
   - **Port 8088**: Temporal UI (different service)
   - The error message mentioning `8088` suggested the wrong service was being contacted

## Solutions Implemented

### 1. Enhanced CORS Middleware

**File:** `backend/internal/api/middleware/cors.go`

**Improvements:**
- ✅ Better logging with startup configuration display
- ✅ Per-request logging showing which origins are allowed/blocked
- ✅ Proper handling of wildcard vs specific origins
- ✅ Correct `Access-Control-Allow-Credentials` behavior
- ✅ Proper `Vary: Origin` header
- ✅ Extended preflight cache (24 hours)
- ✅ Better error responses (403 for blocked origins)

**Key Features:**
```go
// Startup log
log.Printf("[CORS] Configuration loaded - Allowed origins: %v", allowedOrigins)

// Per-request logs (debug mode only)
log.Printf("[CORS] ✓ Allowed: %s → %s %s", origin, method, path)
log.Printf("[CORS] ✗ Blocked: %s → %s %s", origin, method, path)
```

### 2. Development Helper Scripts

**Files:**
- `backend/scripts/dev-api.sh` - Start API server
- `backend/scripts/dev-worker.sh` - Start Temporal worker

**Benefits:**
- ✅ Automatic environment variable setup
- ✅ Unsets conflicting `CORS_ALLOWED_ORIGINS` to use safe defaults
- ✅ Pre-flight checks for PostgreSQL and Temporal
- ✅ Clear visual feedback with colored output
- ✅ Displays configuration before starting

**Usage:**
```bash
cd backend
./scripts/dev-api.sh    # Terminal 1
./scripts/dev-worker.sh # Terminal 2
```

### 3. Comprehensive Documentation

**Updated Files:**
- `CORS_SETUP.md` - Complete CORS configuration guide
- `backend/README.md` - Quick start with new scripts
- `CORS_FIX_SUMMARY.md` - This document

**Includes:**
- Troubleshooting for common CORS errors
- Debug procedures
- Architecture explanations
- Security best practices

## How to Use the Fixes

### Quick Start (Recommended)

1. **Stop any running backend services:**
   ```bash
   # Press Ctrl+C in terminals running the API/worker
   ```

2. **Start services with helper scripts:**
   ```bash
   cd backend
   
   # Terminal 1: API
   ./scripts/dev-api.sh
   
   # Terminal 2: Worker
   ./scripts/dev-worker.sh
   ```

3. **Verify CORS configuration:**
   - Check startup logs for: `[CORS] Configuration loaded - Allowed origins: [http://localhost:3000 http://127.0.0.1:3000]`
   - Make a request from frontend and check for: `[CORS] ✓ Allowed: http://localhost:3000 → ...`

### Manual Start (Alternative)

If you prefer manual control:

```bash
# Clear any existing CORS environment variables
unset CORS_ALLOWED_ORIGINS

# Set required variables
export DATABASE_URL="postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable"
export TEMPORAL_HOST="localhost:7233"
export API_PORT="8080"

# Start servers
go run cmd/api/main.go    # Terminal 1
go run cmd/worker/main.go # Terminal 2
```

## Debugging CORS Issues

### Check Environment

```bash
# See all CORS-related variables
env | grep CORS

# Should output nothing or the correct values
# If you see CORS_ALLOWED_ORIGINS=*, unset it:
unset CORS_ALLOWED_ORIGINS
```

### Check Logs

When API starts, you should see:
```
[CORS] Configuration loaded - Allowed origins: [http://localhost:3000 http://127.0.0.1:3000]
```

When frontend makes requests (in debug mode):
```
[CORS] ✓ Allowed: http://localhost:3000 → OPTIONS /api/v1/workflows
[CORS] ✓ Allowed: http://localhost:3000 → POST /api/v1/workflows
```

### Browser Developer Tools

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Make a request from frontend
4. Check the OPTIONS request (preflight):
   - Response headers should include:
     - `Access-Control-Allow-Origin: http://localhost:3000`
     - `Access-Control-Allow-Credentials: true`
     - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
     - `Access-Control-Allow-Headers: ...`

## Configuration Reference

### Development (Default)

```bash
# Backend automatically uses:
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Production Example

```env
# Backend .env
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
API_PORT=8080
DATABASE_URL=postgres://...
TEMPORAL_HOST=temporal:7233
```

```env
# Frontend .env.production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
```

## Testing CORS

### 1. Health Check (No CORS needed)

```bash
curl http://localhost:8080/health
```

Should return: `{"status":"ok"}`

### 2. With Origin Header (Simulates CORS)

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8080/api/v1/workflows
```

Should return `204` with CORS headers.

### 3. From Frontend

Simply use your Next.js frontend at http://localhost:3000 and interact with the workflow builder.

## Common Pitfalls

❌ **Using `*` with credentials:**
- Wildcard `*` cannot be used with `Access-Control-Allow-Credentials: true`
- Always use specific origins

❌ **Wrong port:**
- API is on `8080`, not `8088`
- Port `8088` is Temporal UI

❌ **Environment variable pollution:**
- Check `env | grep CORS`
- Unset unwanted variables

❌ **Not restarting after changes:**
- Always restart the API server after changing CORS configuration
- Use `Ctrl+C` then restart with `./scripts/dev-api.sh`

## Best Practices

✅ **Development:**
- Use specific localhost origins
- Use helper scripts for consistency
- Enable debug logging

✅ **Production:**
- Use HTTPS only
- Specify exact domains (no wildcards)
- Use environment variables for configuration
- Monitor CORS errors in logs

✅ **Security:**
- Never use `*` in production
- Always validate origins server-side
- Use credentials only when necessary
- Keep CORS configuration in environment variables

## Verification Checklist

After applying fixes, verify:

- [ ] API starts without errors
- [ ] Startup log shows correct CORS origins
- [ ] Frontend can make OPTIONS requests (preflight)
- [ ] Frontend can make POST/GET requests
- [ ] Browser console has no CORS errors
- [ ] Response headers include `Access-Control-Allow-Origin: http://localhost:3000`
- [ ] Worker connects to Temporal successfully

## Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CORS_SETUP.md](./CORS_SETUP.md) - Detailed configuration guide
- [backend/README.md](./backend/README.md) - Backend setup guide
- [Gin CORS Middleware](https://github.com/gin-contrib/cors) - Alternative library

## Need Help?

If you still experience CORS issues:

1. **Check the logs** for `[CORS]` messages
2. **Verify environment** with `env | grep CORS`
3. **Test with curl** (see Testing CORS section)
4. **Check browser console** for detailed error messages
5. **Review** [CORS_SETUP.md](./CORS_SETUP.md) troubleshooting section

