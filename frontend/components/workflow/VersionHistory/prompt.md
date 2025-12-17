# VersionHistory Component Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the VersionHistory component to separate concerns into controller.ts and interface.ts files.

## Current Structure
- **File**: `frontend/components/workflow/VersionHistory.tsx` (271 lines)
- Contains: UI rendering, event handlers, date formatting, and interfaces all in one file

## Target Structure
```
frontend/components/workflow/VersionHistory/
├── VersionHistory.tsx    # UI rendering only
├── controller.ts          # Event handlers, date formatting
├── interface.ts           # Type definitions
└── index.ts               # Exports
```

## What to Extract

### 1. Interfaces (interface.ts)
- `VersionHistoryProps` - Component props interface

### 2. Business Logic (controller.ts)
- `useVersionHistoryController` - Main hook for component logic
- `formatDate` - Date formatting function
- Event handlers:
  - `handleRestoreClick`
  - `handleConfirmRestore`
  - `handleCancelRestore`
  - `handleViewClick`
- State management for restore dialog and loading states

## Step-by-Step Refactoring

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/components/workflow/VersionHistory
```

### Step 2: Extract Interfaces
Create `interface.ts`:
- Export `VersionHistoryProps` interface
- Import necessary types from dag types

### Step 3: Extract Business Logic
Create `controller.ts`:
- Create `useVersionHistoryController` hook with:
  - State management (restoringVersion, showConfirmDialog)
  - Effect for auto-refresh on open
  - `formatDate` function
  - All event handlers
- Export the hook

### Step 4: Update VersionHistory.tsx
- Import interfaces from `./interface`
- Import hook from `./controller`
- Keep only UI rendering logic
- Use hook for all business logic

### Step 5: Create Index File
Create `index.ts`:
- Export component and types for cleaner imports

### Step 6: Update Imports in Parent Components
Update any files that import VersionHistory:
- Import path should work with index.ts

## Import/Export Examples

### interface.ts
```typescript
import { WorkflowVersion } from "@/lib/types/dag";

export interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  versions: WorkflowVersion[];
  currentVersion: number;
  isLoading: boolean;
  viewingVersion?: number | null;
  onRestore: (versionNumber: number) => Promise<void>;
  onView: (versionNumber: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}
```

### controller.ts
```typescript
import { useState, useEffect, useRef } from "react";
import { VersionHistoryProps } from "./interface";

export function useVersionHistoryController({
  isOpen,
  workflowId,
  onRefresh,
  onRestore,
  onView,
  onClose,
}: VersionHistoryProps) {
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(null);
  
  // Auto-refresh effect
  useEffect(() => { ... }, [isOpen, workflowId]);

  // Date formatting
  const formatDate = (dateString: string) => { ... };

  // Event handlers
  const handleRestoreClick = (versionNumber: number) => { ... };
  const handleConfirmRestore = async () => { ... };
  const handleCancelRestore = () => { ... };
  const handleViewClick = async (versionNumber: number) => { ... };

  return {
    restoringVersion,
    showConfirmDialog,
    formatDate,
    handleRestoreClick,
    handleConfirmRestore,
    handleCancelRestore,
    handleViewClick,
  };
}
```

### VersionHistory.tsx
```typescript
import { VersionHistoryProps } from "./interface";
import { useVersionHistoryController } from "./controller";

export function VersionHistory({...}: VersionHistoryProps) {
  const {
    restoringVersion,
    showConfirmDialog,
    formatDate,
    handleRestoreClick,
    handleConfirmRestore,
    handleCancelRestore,
    handleViewClick,
  } = useVersionHistoryController({...});

  // ... UI rendering only
}
```

## Testing Checklist
- [ ] Component renders correctly
- [ ] Version list displays correctly
- [ ] Date formatting works
- [ ] View button works
- [ ] Restore button works
- [ ] Confirmation dialog works
- [ ] Auto-refresh on open works
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- The controller hook manages all state and event handlers
- Date formatting is extracted to the controller for reusability
- The component file should be minimal and focused on rendering
- Modal components are kept in the main component file as they're part of the UI structure

