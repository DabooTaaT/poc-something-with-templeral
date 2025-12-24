# HttpNode Component Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the HttpNode component to separate constants into constant.ts file.

## Current Structure
- **File**: `frontend/components/canvas/HttpNode.tsx` (116 lines)
- Contains: UI rendering and constants in one file

## Target Structure
```
frontend/components/canvas/HttpNode/
├── HttpNode.tsx    # UI rendering only
├── constant.ts     # Constants
└── index.ts        # Exports
```

## What to Extract

### 1. Constants (constant.ts)
- `methodBadgeColors` - Color mapping for HTTP method badges

## Step-by-Step Refactoring

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/components/canvas/HttpNode
```

### Step 2: Extract Constants
Create `constant.ts`:
- Export `methodBadgeColors` constant
- Define color classes for each HTTP method

### Step 3: Update HttpNode.tsx
- Import constants from `./constant`
- Keep only UI rendering logic
- Use imported constants

### Step 4: Create Index File
Create `index.ts`:
- Export component for cleaner imports

### Step 5: Update Imports in Parent Components
Update any files that import HttpNode:
- Update CustomNodes.tsx to import from new path
- Or update to use index.ts

## Import/Export Examples

### constant.ts
```typescript
export const methodBadgeColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800",
  POST: "bg-green-100 text-green-800",
  PUT: "bg-orange-100 text-orange-800",
  DELETE: "bg-red-100 text-red-800",
  PATCH: "bg-purple-100 text-purple-800",
};
```

### HttpNode.tsx
```typescript
import { Handle, Position, NodeProps } from "reactflow";
import { HttpNodeData } from "@/lib/types/dag";
import { methodBadgeColors } from "./constant";

export function HttpNode({ data, selected }: NodeProps<HttpNodeData>) {
  // ... UI rendering using methodBadgeColors
}
```

## Testing Checklist
- [ ] Component renders correctly
- [ ] Method badge colors display correctly
- [ ] URL truncation works
- [ ] Node selection works
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- This is a simple refactoring with only constants to extract
- The component is mostly presentational
- Constants are extracted for better maintainability


