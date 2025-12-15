# n8n-clone Frontend (Next.js + React Flow)

## Overview
Frontend workflow builder using:
- **Next.js** (App Router) for the framework
- **React Flow** for visual DAG canvas
- **Tailwind CSS** for styling
- **TypeScript** for type safety

## Prerequisites
- Node.js 18+ LTS
- npm / pnpm / yarn

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx           # Main canvas page
├── components/
│   ├── canvas/            # React Flow components
│   ├── ui/                # Reusable UI components
│   └── execution/         # Execution result display
├── lib/
│   ├── dag/               # DAG validation logic
│   ├── api/               # API client
│   └── types/             # TypeScript types
├── hooks/                 # Custom React hooks
│   ├── useWorkflow.ts
│   └── useExecution.ts
└── public/                # Static assets
```

## Features to Implement

### Canvas Components
- [ ] FlowCanvas - Main React Flow canvas
- [ ] CustomNodes - Start, HTTP, Output node components
- [ ] NodeConfigPanel - Configuration panel for nodes
- [ ] Toolbar - Add nodes, save, run buttons

### Execution
- [ ] ExecutionResult - Display execution results
- [ ] Status polling with auto-refresh

### UI Components
- [ ] Button components
- [ ] Modal/Dialog
- [ ] Toast notifications
- [ ] Loading indicators

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Next Steps
1. Implement FlowCanvas component with React Flow
2. Create custom node components (Start, HTTP, Output)
3. Implement NodeConfigPanel for editing node properties
4. Add execution result display
5. Style with Tailwind CSS
6. Add tests

## API Integration
The frontend communicates with the backend API at `NEXT_PUBLIC_API_URL`:
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/:id` - Get workflow
- `POST /api/v1/workflows/:id/run` - Execute workflow
- `GET /api/v1/executions/:id` - Get execution status
