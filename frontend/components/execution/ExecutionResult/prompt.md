# ExecutionResult Component Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the ExecutionResult component to separate concerns into controller.ts and interface.ts files.

## Current Structure
- **File**: `frontend/components/execution/ExecutionResult.tsx` (241 lines)
- Contains: UI rendering, helper functions, and interfaces all in one file

## Target Structure
```
frontend/components/execution/ExecutionResult/
├── ExecutionResult.tsx    # UI rendering only
├── controller.ts          # Helper functions (getStatusColor, formatDuration)
├── interface.ts           # Type definitions
└── index.ts               # Exports
```

## What to Extract

### 1. Interfaces (interface.ts)
- `ExecutionResultProps` - Component props interface

### 2. Business Logic (controller.ts)
- `getStatusColor` - Function to get status color classes
- `formatDuration` - Function to format execution duration

## Step-by-Step Refactoring

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/components/execution/ExecutionResult
```

### Step 2: Extract Interfaces
Create `interface.ts`:
- Export `ExecutionResultProps` interface
- Import necessary types from dag types

### Step 3: Extract Business Logic
Create `controller.ts`:
- Export `getStatusColor` function
- Export `formatDuration` function
- These are pure utility functions, not hooks

### Step 4: Update ExecutionResult.tsx
- Import interfaces from `./interface`
- Import helper functions from `./controller`
- Keep only UI rendering logic
- Use imported functions

### Step 5: Create Index File
Create `index.ts`:
- Export component and types for cleaner imports

### Step 6: Update Imports in Parent Components
Update any files that import ExecutionResult:
- Import path should work with index.ts

## Import/Export Examples

### interface.ts
```typescript
import { Execution } from "@/lib/types/dag";

export interface ExecutionResultProps {
  execution: Execution | null;
  onClose: () => void;
}
```

### controller.ts
```typescript
import { Execution } from "@/lib/types/dag";

export function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800 border-green-300";
    case "RUNNING":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "FAILED":
      return "bg-red-100 text-red-800 border-red-300";
    case "PENDING":
      return "bg-gray-100 text-gray-800 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

export function formatDuration(execution: Execution): string {
  if (!execution.started_at || !execution.finished_at) return "N/A";
  const start = new Date(execution.started_at).getTime();
  const end = new Date(execution.finished_at).getTime();
  const duration = (end - start) / 1000;
  return `${duration.toFixed(2)}s`;
}
```

### ExecutionResult.tsx
```typescript
import { ExecutionResultProps } from "./interface";
import { getStatusColor, formatDuration } from "./controller";

export function ExecutionResult({ execution, onClose }: ExecutionResultProps) {
  if (!execution) return null;

  // ... UI rendering using getStatusColor and formatDuration
}
```

## Testing Checklist
- [ ] Component renders correctly
- [ ] Status colors display correctly
- [ ] Duration formatting works
- [ ] Error display works
- [ ] Result display works
- [ ] Copy button works
- [ ] Close button works
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- Helper functions are extracted as pure functions (not hooks)
- The component file should be minimal and focused on rendering
- Status color mapping is extracted for better maintainability
- Duration formatting is extracted for reusability

