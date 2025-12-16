# Workflow Builder Backend

Go backend with Gin framework, PostgreSQL, and Temporal for workflow orchestration.

## Prerequisites

- Go 1.22+
- Docker & Docker Compose
- PostgreSQL (via Docker)
- Temporal (via Docker)

## Quick Start

### 1. Start Infrastructure (PostgreSQL + Temporal)

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port `5432`
- Temporal server on port `7233`
- Temporal UI on port `8088`

### 2. Run Database Migrations

**Option A: Using the migration script (recommended)**

```bash
./scripts/migrate.sh
```

**Option B: Manual migration**

```bash
docker exec -i workflow_postgres psql -U workflow_user -d workflow_db < internal/db/migrations/001_init_schema.sql
```

### 3. Start Development Servers

**Using Helper Scripts (Recommended):**

The easiest way to start the backend services with correct environment configuration:

```bash
# Terminal 1: Start API Server
./scripts/dev-api.sh

# Terminal 2: Start Temporal Worker
./scripts/dev-worker.sh
```

These scripts will:
- ✓ Set all required environment variables automatically
- ✓ Use correct CORS settings for development (`http://localhost:3000`)
- ✓ Check if dependencies (PostgreSQL, Temporal) are running
- ✓ Display configuration before starting

**Manual Start (Alternative):**

If you prefer manual control:

```bash
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

### 4. Verify Setup

The API will be available at: http://localhost:8080

Test endpoints:
- Health check: http://localhost:8080/health
- Temporal UI: http://localhost:8088

### 5. Common Issues

**CORS Errors:**
If you see CORS errors like "has a value 'http://localhost:8088'":
- Make sure you're using `./scripts/dev-api.sh` OR
- Unset `CORS_ALLOWED_ORIGINS`: `unset CORS_ALLOWED_ORIGINS`
- Restart the API server

**Port Already in Use:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9
```

See [CORS_SETUP.md](../CORS_SETUP.md) for detailed troubleshooting.

## Project Structure

```
backend/
├── cmd/
│   ├── api/              # API server entry point
│   │   └── main.go
│   └── worker/           # Temporal worker entry point
│       └── main.go
├── internal/
│   ├── api/
│   │   ├── handlers/     # HTTP handlers
│   │   │   ├── workflow.go
│   │   │   └── execution.go
│   │   └── middleware/   # HTTP middleware
│   │       └── cors.go
│   ├── db/
│   │   ├── migrations/   # Database migrations
│   │   │   └── 001_init_schema.sql
│   │   └── models/       # Data models
│   │       ├── workflow.go
│   │       └── execution.go
│   ├── service/          # Business logic
│   │   ├── workflow_service.go
│   │   └── execution_service.go
│   └── temporal/         # Temporal workflows & activities
│       ├── workflow.go
│       └── activities.go
├── pkg/
│   └── dag/              # DAG validation utilities
│       └── validation.go
├── scripts/
│   └── migrate.sh        # Database migration script
├── docker-compose.yml    # Infrastructure setup
├── go.mod
└── go.sum
```

## API Endpoints

### Workflows

- `POST /api/v1/workflows` - Create a new workflow
- `GET /api/v1/workflows/:id` - Get workflow by ID
- `PUT /api/v1/workflows/:id` - Update workflow
- `GET /api/v1/workflows` - List all workflows

### Executions

- `POST /api/v1/workflows/:id/run` - Run a workflow
- `GET /api/v1/executions/:id` - Get execution status
- `GET /api/v1/workflows/:id/executions` - List workflow executions

### Health

- `GET /health` - Health check endpoint

## Database Schema

### Workflows Table

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dag_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Executions Table

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
```

## Development

### Running Tests

```bash
go test ./...
```

### Building

```bash
# Build API
go build -o bin/api cmd/api/main.go

# Build Worker
go build -o bin/worker cmd/worker/main.go
```

### Linting

```bash
golangci-lint run
```

## Docker Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f temporal
```

### Stop Services

```bash
docker-compose down
```

### Reset Database

```bash
# Stop and remove volumes
docker-compose down -v

# Start again
docker-compose up -d

# Run migrations
./scripts/migrate.sh
```

### Connect to PostgreSQL

```bash
docker exec -it workflow_postgres psql -U workflow_user -d workflow_db
```

Useful psql commands:
- `\dt` - List tables
- `\d workflows` - Describe workflows table
- `\d executions` - Describe executions table
- `\q` - Quit

### Access Temporal UI

Open browser: http://localhost:8088

## Troubleshooting

### "relation workflows does not exist"

**Solution:** Run database migrations

```bash
./scripts/migrate.sh
```

### "DATABASE_URL is required"

**Solution:** Create `.env` file with DATABASE_URL

```bash
echo 'DATABASE_URL=postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable' > .env
```

### "Failed to connect to database"

**Solution:** Check if PostgreSQL container is running

```bash
docker ps | grep workflow_postgres

# If not running, start it
docker-compose up -d postgres
```

### "Failed to connect to Temporal"

**Solution:** Check if Temporal server is running

```bash
docker ps | grep temporal

# If not running, start it
docker-compose up -d temporal
```

### CORS Errors

**Solution:** Update CORS_ALLOWED_ORIGINS in `.env`

```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | API server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `TEMPORAL_HOST` | Temporal server address | `localhost:7233` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://127.0.0.1:3000` |

## Dependencies

Key Go packages:
- **gin-gonic/gin** - HTTP web framework
- **lib/pq** - PostgreSQL driver
- **go.temporal.io/sdk** - Temporal SDK
- **google/uuid** - UUID generation
- **joho/godotenv** - Environment variables

## Temporal Workflow

The backend uses Temporal for workflow orchestration:

1. **Workflow Definition** (`internal/temporal/workflow.go`)
   - Receives DAG from API
   - Performs topological sort
   - Executes nodes in order

2. **Activities** (`internal/temporal/activities.go`)
   - `HttpRequestActivity` - Makes HTTP requests
   - Output handling

3. **Worker** (`cmd/worker/main.go`)
   - Connects to Temporal
   - Registers workflows and activities
   - Processes workflow tasks

## Production Deployment

### Build Docker Image

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/api cmd/api/main.go
RUN CGO_ENABLED=0 go build -o /app/worker cmd/worker/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/api .
COPY --from=builder /app/worker .
```

### Environment Configuration

For production, update:
- `CORS_ALLOWED_ORIGINS` to production domains
- `DATABASE_URL` to production database
- `TEMPORAL_HOST` to production Temporal server
- Set `GIN_MODE=release`

## Related Documentation

- [Main README](../README.md) - Project overview
- [CORS Setup](../CORS_SETUP.md) - CORS configuration
- [Middleware Setup](../MIDDLEWARE_SETUP.md) - Middleware documentation
- [Frontend README](../frontend/README.md) - Frontend documentation

## License

MIT
