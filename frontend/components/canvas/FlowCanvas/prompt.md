# FlowCanvas Component Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the FlowCanvas component to separate concerns into controller.ts, interface.ts, and constant.ts files.

## Current Structure
- **File**: `frontend/components/canvas/FlowCanvas.tsx` (396 lines)
- Contains: UI rendering, business logic, event handlers, constants, and interfaces all in one file

## Target Structure
```
frontend/components/canvas/FlowCanvas/
├── FlowCanvas.tsx          # UI rendering only
├── controller.ts           # Business logic and event handlers
├── interface.ts            # Type definitions
├── constant.ts             # Constants
├── DropHandler.tsx         # Drop handler component
└── ViewportSynchronizer.tsx # Viewport synchronizer component
```

## What to Extract

### 1. Interfaces (interface.ts)
- `FlowCanvasProps` - Component props interface

### 2. Constants (constant.ts)
- `NODE_TYPES` - Node type mapping

### 3. Business Logic (controller.ts)
- `useFlowCanvasController` - Main hook for canvas state management
- `useDropHandler` - Hook for handling drag and drop
- `useViewportSynchronizer` - Hook for viewport synchronization
- All event handlers:
  - `onConnect`
  - `handleNodesChange`
  - `handleEdgesChange`
  - `handleNodeDragStop`
  - `handleNodeClick`
  - `handleNodeDoubleClick`
- State synchronization logic
- Drag tracking logic

### 4. Components
- `DropHandler` - Extracted to separate component file
- `ViewportSynchronizer` - Extracted to separate component file

## Step-by-Step Refactoring

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/components/canvas/FlowCanvas
```

### Step 2: Extract Interfaces
Create `interface.ts`:
- Export `FlowCanvasProps` interface
- Import necessary types from reactflow and dag types

### Step 3: Extract Constants
Create `constant.ts`:
- Export `NODE_TYPES` constant
- Import node components from CustomNodes

### Step 4: Extract Business Logic
Create `controller.ts`:
- Create `useFlowCanvasController` hook with all state management
- Create `useDropHandler` hook for drag and drop
- Create `useViewportSynchronizer` hook for viewport sync
- Export all hooks and types

### Step 5: Extract Sub-Components
Create `DropHandler.tsx`:
- Component that uses `useDropHandler` hook
- Returns null (side-effect only component)

Create `ViewportSynchronizer.tsx`:
- Component that uses `useViewportSynchronizer` hook
- Returns null (side-effect only component)

### Step 6: Update FlowCanvas.tsx
- Import interfaces from `./interface`
- Import constants from `./constant`
- Import hooks from `./controller`
- Import sub-components
- Keep only UI rendering logic
- Use hooks for all business logic

### Step 7: Update Imports in Parent Components
Update any files that import FlowCanvas:
- Change import path from `./FlowCanvas` to `./FlowCanvas/FlowCanvas`
- Or create an index.ts file for cleaner imports

## Import/Export Examples

### interface.ts
```typescript
import { Edge, Viewport } from "reactflow";
import { Node as DAGNode } from "@/lib/types/dag";

export interface FlowCanvasProps {
  // ... props definition
}
```

### constant.ts
```typescript
import { NodeTypes } from "reactflow";
import { StartNode, HttpNode, CodeNode, OutputNode } from "../CustomNodes";

export const NODE_TYPES: NodeTypes = {
  start: StartNode,
  http: HttpNode,
  code: CodeNode,
  output: OutputNode,
};
```

### controller.ts
```typescript
import { useCallback, useEffect, useRef } from "react";
import { /* reactflow imports */ } from "reactflow";
import { FlowCanvasProps } from "./interface";

export function useFlowCanvasController({...}) {
  // ... implementation
}

export function useDropHandler(onAddNode) {
  // ... implementation
}

export function useViewportSynchronizer(viewport) {
  // ... implementation
}
```

### FlowCanvas.tsx
```typescript
import { FlowCanvasProps } from "./interface";
import { NODE_TYPES } from "./constant";
import { useFlowCanvasController } from "./controller";
import { DropHandler } from "./DropHandler";
import { ViewportSynchronizer } from "./ViewportSynchronizer";

export function FlowCanvas({...}: FlowCanvasProps) {
  const { nodes, edges, ...handlers } = useFlowCanvasController({...});
  // ... UI rendering
}
```

## Testing Checklist
- [ ] Component renders correctly
- [ ] Nodes can be dragged
- [ ] Nodes can be connected
- [ ] Drag and drop works
- [ ] Viewport synchronization works
- [ ] Node click events work
- [ ] Node double-click events work
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- The DropHandler and ViewportSynchronizer are kept as separate components because they need to be inside ReactFlow context
- All hooks are exported from controller.ts for potential reuse
- The main component file should be minimal and focused on rendering

