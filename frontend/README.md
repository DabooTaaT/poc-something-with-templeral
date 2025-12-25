# Workflow Builder Frontend

Modern workflow builder frontend built with Next.js 15, React 19, and ReactFlow.

## Features

- 🎨 Visual workflow builder with drag-and-drop
- 🚀 Real-time workflow execution
- 📊 Execution result visualization
- 🔐 Secure API communication with CORS
- 🛠️ Enhanced error handling and logging
- ⚡ Fast Edge runtime middleware

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **UI:** React 19, TailwindCSS 4
- **Workflow Canvas:** ReactFlow 11
- **HTTP Client:** Axios with custom interceptors
- **Language:** TypeScript 5

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Backend API running (see `../backend/README.md`)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local and set your API URL
# NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Configuration

Create `.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# Enable credentials (cookies, authorization headers)
NEXT_PUBLIC_API_WITH_CREDENTIALS=true

# API timeout in milliseconds (default: 30000 = 30 seconds)
NEXT_PUBLIC_API_TIMEOUT=30000
```

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   ├── canvas/            # Workflow canvas components
│   │   ├── FlowCanvas.tsx
│   │   ├── CustomNodes.tsx
│   │   ├── HttpNode.tsx
│   │   ├── StartNode.tsx
│   │   ├── OutputNode.tsx
│   │   └── NodeConfigPanel.tsx
│   ├── execution/         # Execution result components
│   │   └── ExecutionResult.tsx
│   └── ui/                # Reusable UI components
│       ├── Button.tsx
│       └── Modal.tsx
├── hooks/                 # React hooks
│   ├── useWorkflow.ts
│   └── useExecution.ts
├── lib/
│   ├── api/              # API client and middleware
│   │   ├── client.ts     # Main API client with interceptors
│   │   └── middleware.ts # Middleware utilities
│   ├── dag/              # DAG validation logic
│   │   └── validation.ts
│   └── types/            # TypeScript types
│       └── dag.ts
├── middleware.ts          # Next.js Edge middleware
├── .env.example          # Environment variables template
├── package.json
└── tsconfig.json
```

## API Client

The API client (`lib/api/client.ts`) includes advanced features:

### Request Interceptor
- Automatic header injection
- Request logging (development)
- Timestamp tracking
- Client timezone detection

### Response Interceptor
- Response logging (development)
- Enhanced error handling
- Status code specific error messages
- Network error detection

### Usage Example

```typescript
import { apiClient } from '@/lib/api/client';

// Create workflow
const { id } = await apiClient.createWorkflow(workflow);

// Get workflow
const workflow = await apiClient.getWorkflow(id);

// Run workflow
const { execution_id } = await apiClient.runWorkflow(id);

// Get execution status
const execution = await apiClient.getExecution(execution_id);
```

## Middleware

### Next.js Edge Middleware (`middleware.ts`)

Runs on all routes (except static files) and adds:
- Security headers (X-Frame-Options, CSP, etc.)
- Response timestamp
- Request logging (development)

### API Middleware Utilities (`lib/api/middleware.ts`)

Reusable middleware functions:
- `requestLogger` - Log requests
- `responseLogger` - Log responses
- `addStandardHeaders` - Add headers
- `errorHandler` - Handle errors
- `shouldRetry` - Retry logic
- `getTimeout` - Get operation timeout

## Development Tips

### Debugging API Calls

All API calls are logged in development mode. Open browser console to see:

```
[API Request] POST /api/v1/workflows { data: {...} }
[API Response] POST /api/v1/workflows { status: 201, data: {...} }
```

### CORS Issues

If you see CORS errors:
1. Check backend is running on correct port
2. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
3. Ensure backend `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`

### Error Handling

All API errors are normalized to user-friendly messages:

```typescript
try {
  await apiClient.getWorkflow('invalid-id');
} catch (error) {
  console.error(error.message); // "Resource not found."
}
```

## Components

### FlowCanvas
Visual workflow builder with ReactFlow:
- Start, HTTP, and Output nodes
- Drag-and-drop connections
- Node configuration panel
- Real-time validation

### ExecutionResult
Display execution results:
- Workflow execution status
- Node execution details
- HTTP request/response visualization
- Syntax-highlighted JSON

## Hooks

### useWorkflow
Manage workflow state and operations:
```typescript
const { workflow, saveWorkflow, loading, error } = useWorkflow(id);
```

### useExecution
Manage workflow execution:
```typescript
const { execute, execution, loading, error } = useExecution();
```

## Styling

- **TailwindCSS 4** for utility-first styling
- **CSS Modules** for component-specific styles
- **Dark mode** support (coming soon)

## Testing

```bash
# Run linter
npm run lint
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080` |
| `NEXT_PUBLIC_API_WITH_CREDENTIALS` | Send credentials | `true` |
| `NEXT_PUBLIC_API_TIMEOUT` | API timeout (ms) | `30000` |
| `NODE_ENV` | Environment | `development` |

## Troubleshooting

### "Network error: No response from server"
- Backend is not running
- CORS is not configured correctly
- API URL is incorrect

### "Module not found" errors
- Run `npm install` again
- Delete `node_modules` and `.next`, then `npm install`

### TypeScript errors
- Run `npm run build` to check for type errors
- Ensure all types are properly defined

## Contributing

1. Follow TypeScript strict mode
2. Use functional components with hooks
3. Add proper error handling
4. Write meaningful commit messages
5. Test on both Chrome and Firefox

## Related Documentation

- [Middleware Setup](../MIDDLEWARE_SETUP.md) - Complete middleware guide
- [CORS Setup](../CORS_SETUP.md) - CORS configuration guide
- [Backend README](../backend/README.md) - Backend documentation

## License

MIT
