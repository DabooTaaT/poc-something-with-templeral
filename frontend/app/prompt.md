# Home Page (page.tsx) Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the Home page component to separate concerns into controller.ts, constant.ts, and utils.ts files.

## Current Structure
- **File**: `frontend/app/page.tsx` (1087 lines)
- Contains: UI rendering, all business logic, event handlers, constants, and utility functions all in one file

## Target Structure
```
frontend/app/
├── page.tsx          # UI rendering only
├── controller.ts     # All event handlers and state management logic
├── constant.ts       # Constants (DEFAULT_HISTORY_LIMIT, DRAFT_WORKFLOW_ID, DEFAULT_VIEWPORT, statusClassMap)
├── utils.ts          # Utility functions (createSnapshot, formatRelativeTime)
└── prompt.md         # This file
```

## What to Extract

### 1. Constants (constant.ts)
- `DEFAULT_HISTORY_LIMIT` - Default limit for history pagination
- `DRAFT_WORKFLOW_ID` - ID for draft workflows
- `DEFAULT_VIEWPORT` - Default viewport configuration
- `statusClassMap` - Status color mapping

### 2. Utility Functions (utils.ts)
- `createSnapshot` - Function to create workflow snapshot
- `formatRelativeTime` - Function to format relative timestamps

### 3. Business Logic (controller.ts)
- `useHomeController` - Main hook for all page logic
- All state management
- All event handlers:
  - `handleAddNode`
  - `handleNodeClick`
  - `handleNodeDoubleClick`
  - `handleSaveNodeConfig`
  - `handleDeleteSelected`
  - `handleWorkflowNameChange`
  - `handleSaveWorkflow`
  - `handleRunWorkflow`
  - `handleRunWorkflowFromHistory`
  - `handleViewportChange`
  - `handleEditWorkflow`
  - `handleCreateNewWorkflow`
  - `handleViewExecutionResult`
  - `handleRefreshVersions`
  - `handleRestoreVersion`
  - `handleViewVersion`
- `fetchHistory` - History fetching logic
- All useEffect hooks for side effects

## Step-by-Step Refactoring

### Step 1: Extract Constants
Create `constant.ts`:
- Export all constants
- Import Viewport type from reactflow

### Step 2: Extract Utility Functions
Create `utils.ts`:
- Export `createSnapshot` function
- Export `formatRelativeTime` function
- Import necessary types

### Step 3: Extract Business Logic
Create `controller.ts`:
- Create `useHomeController` hook
- Move all state management to the hook
- Move all event handlers to the hook
- Move all useEffect hooks to the hook
- Export the hook and its return type

### Step 4: Update page.tsx
- Import constants from `./constant`
- Import utilities from `./utils`
- Import controller hook from `./controller`
- Remove all business logic
- Use the controller hook for all logic
- Keep only UI rendering

## Import/Export Examples

### constant.ts
```typescript
import type { Viewport } from "reactflow";

export const DEFAULT_HISTORY_LIMIT = 20;
export const DRAFT_WORKFLOW_ID = "__draft__";
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const statusClassMap: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  RUNNING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};
```

### utils.ts
```typescript
import { Node, Edge } from "@/lib/types/dag";

export const createSnapshot = (name: string, nodes: Node[], edges: Edge[]) =>
  JSON.stringify({
    name,
    nodes,
    edges,
  });

export const formatRelativeTime = (timestamp?: string) => {
  // ... implementation
};
```

### controller.ts
```typescript
import { useState, useCallback, useEffect, useMemo } from "react";
import { createSnapshot, formatRelativeTime } from "./utils";
import { DRAFT_WORKFLOW_ID, DEFAULT_VIEWPORT } from "./constant";

export function useHomeController({...}) {
  // All state
  // All effects
  // All handlers
  
  return {
    // All state and handlers
  };
}
```

### page.tsx
```typescript
import { statusClassMap } from "./constant";
import { useHomeController } from "./controller";

export default function Home() {
  const workflow = useWorkflow();
  const execution = useExecution();
  
  const {
    // All state and handlers from controller
  } = useHomeController({...});

  // ... UI rendering only
}
```

## Testing Checklist
- [ ] Page renders correctly
- [ ] All event handlers work
- [ ] State management works
- [ ] History fetching works
- [ ] Workflow operations work
- [ ] Node operations work
- [ ] Execution operations work
- [ ] Version operations work
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- This is the largest refactoring as page.tsx contains the most logic
- The controller hook will be comprehensive and handle all business logic
- The page component should be minimal and focused on rendering
- All constants and utilities are extracted for reusability


