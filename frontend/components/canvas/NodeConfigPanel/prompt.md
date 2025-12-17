# NodeConfigPanel Component Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the NodeConfigPanel component to separate concerns into controller.ts and interface.ts files.

## Current Structure
- **File**: `frontend/components/canvas/NodeConfigPanel.tsx` (636 lines)
- Contains: UI rendering, form state management, JSON parsing logic, and interfaces all in one file

## Target Structure
```
frontend/components/canvas/NodeConfigPanel/
├── NodeConfigPanel.tsx    # UI rendering only
├── controller.ts            # Form handling, JSON parsing, validation
├── interface.ts            # Type definitions
└── index.ts                # Exports
```

## What to Extract

### 1. Interfaces (interface.ts)
- `NodeConfigPanelProps` - Component props interface

### 2. Business Logic (controller.ts)
- `useNodeConfigController` - Main hook for form state management
- Form state initialization
- JSON parsing logic for headers, query, and body
- Form submission handling
- Field change handlers

## Step-by-Step Refactoring

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/components/canvas/NodeConfigPanel
```

### Step 2: Extract Interfaces
Create `interface.ts`:
- Export `NodeConfigPanelProps` interface
- Import necessary types from dag types

### Step 3: Extract Business Logic
Create `controller.ts`:
- Create `useNodeConfigController` hook with:
  - Form data state management
  - Textarea state management (headersText, queryText, bodyText)
  - Node change detection and initialization
  - JSON parsing logic for HTTP node fields
  - Form submission handler
  - Field change handler
- Export the hook

### Step 4: Update NodeConfigPanel.tsx
- Import interfaces from `./interface`
- Import hook from `./controller`
- Keep only UI rendering logic
- Use hook for all business logic

### Step 5: Create Index File
Create `index.ts`:
- Export component and types for cleaner imports

### Step 6: Update Imports in Parent Components
Update any files that import NodeConfigPanel:
- Import path should work with index.ts

## Import/Export Examples

### interface.ts
```typescript
import { Node, NodeData } from "@/lib/types/dag";

export interface NodeConfigPanelProps {
  node: Node | null;
  onSave: (nodeId: string, data: NodeData) => void;
  onClose: () => void;
}
```

### controller.ts
```typescript
import { useState, useEffect, useRef } from "react";
import { Node, NodeData, HttpNodeData, isHttpNode } from "@/lib/types/dag";
import { NodeConfigPanelProps } from "./interface";

export function useNodeConfigController({
  node,
  onSave,
  onClose,
}: NodeConfigPanelProps) {
  // Form state
  const [formData, setFormData] = useState<NodeData | null>(...);
  const [headersText, setHeadersText] = useState<string>("");
  // ... other state

  // Node change detection
  useEffect(() => {
    // Initialize form data when node changes
  }, [node]);

  // Form handlers
  const handleChange = (field, value) => { ... };
  const handleSubmit = (e) => { ... };

  return {
    formData,
    headersText,
    queryText,
    bodyText,
    setHeadersText,
    setQueryText,
    setBodyText,
    handleChange,
    handleSubmit,
  };
}
```

### NodeConfigPanel.tsx
```typescript
import { NodeConfigPanelProps } from "./interface";
import { useNodeConfigController } from "./controller";

export function NodeConfigPanel({ node, onSave, onClose }: NodeConfigPanelProps) {
  const {
    formData,
    headersText,
    queryText,
    bodyText,
    setHeadersText,
    setQueryText,
    setBodyText,
    handleChange,
    handleSubmit,
  } = useNodeConfigController({ node, onSave, onClose });

  if (!node || !formData) return null;

  // ... UI rendering only
}
```

## Testing Checklist
- [ ] Component renders correctly
- [ ] Form fields update correctly
- [ ] JSON parsing works for headers
- [ ] JSON parsing works for query parameters
- [ ] JSON parsing works for request body
- [ ] Form submission works
- [ ] Node type switching works
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- The controller hook manages all form state and business logic
- JSON parsing is handled in the controller to allow free typing in textareas
- The component file should be minimal and focused on rendering
- All node type-specific logic is handled in the controller

