# Modal Component Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the Modal component to separate concerns into interface.ts and constant.ts files.

## Current Structure
- **File**: `frontend/components/ui/Modal.tsx` (65 lines)
- Contains: UI rendering, interfaces, and constants all in one file

## Target Structure
```
frontend/components/ui/Modal/
├── Modal.tsx         # UI rendering only
├── interface.ts       # Type definitions
├── constant.ts       # Constants (sizeStyles)
└── index.ts          # Exports
```

## What to Extract

### 1. Interfaces (interface.ts)
- `ModalProps` - Component props interface

### 2. Constants (constant.ts)
- `sizeStyles` - Size-specific styles

## Step-by-Step Refactoring

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/components/ui/Modal
```

### Step 2: Extract Interfaces
Create `interface.ts`:
- Export `ModalProps` interface
- Import necessary types from React

### Step 3: Extract Constants
Create `constant.ts`:
- Export `sizeStyles` constant

### Step 4: Update Modal.tsx
- Import interfaces from `./interface`
- Import constants from `./constant`
- Keep only UI rendering logic
- Use imported constants

### Step 5: Create Index File
Create `index.ts`:
- Export component and types for cleaner imports

### Step 6: Update Imports in Parent Components
Update any files that import Modal:
- Import path should work with index.ts

## Import/Export Examples

### interface.ts
```typescript
import { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}
```

### constant.ts
```typescript
export const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};
```

### Modal.tsx
```typescript
import { useEffect } from "react";
import { ModalProps } from "./interface";
import { sizeStyles } from "./constant";

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  // ... implementation using sizeStyles
}
```

## Testing Checklist
- [ ] Component renders correctly
- [ ] All sizes work
- [ ] Open/close works
- [ ] Body scroll lock works
- [ ] Click outside to close works
- [ ] Title displays correctly
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- This is a simple refactoring with only constants and interfaces to extract
- The component includes a useEffect for body scroll lock
- Constants are extracted for better maintainability


