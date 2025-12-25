# Button Component Refactoring Prompt

## Overview
This document provides step-by-step instructions for refactoring the Button component to separate concerns into interface.ts and constant.ts files.

## Current Structure
- **File**: `frontend/components/ui/Button.tsx` (59 lines)
- Contains: UI rendering, interfaces, and constants all in one file

## Target Structure
```
frontend/components/ui/Button/
├── Button.tsx        # UI rendering only
├── interface.ts      # Type definitions
├── constant.ts       # Constants (baseStyles, variantStyles, sizeStyles)
└── index.ts          # Exports
```

## What to Extract

### 1. Interfaces (interface.ts)
- `ButtonProps` - Component props interface

### 2. Constants (constant.ts)
- `baseStyles` - Base button styles
- `variantStyles` - Variant-specific styles
- `sizeStyles` - Size-specific styles

## Step-by-Step Refactoring

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/components/ui/Button
```

### Step 2: Extract Interfaces
Create `interface.ts`:
- Export `ButtonProps` interface
- Import necessary types from React

### Step 3: Extract Constants
Create `constant.ts`:
- Export `baseStyles` constant
- Export `variantStyles` constant
- Export `sizeStyles` constant

### Step 4: Update Button.tsx
- Import interfaces from `./interface`
- Import constants from `./constant`
- Keep only UI rendering logic
- Use imported constants

### Step 5: Create Index File
Create `index.ts`:
- Export component and types for cleaner imports

### Step 6: Update Imports in Parent Components
Update any files that import Button:
- Import path should work with index.ts

## Import/Export Examples

### interface.ts
```typescript
import { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}
```

### constant.ts
```typescript
export const baseStyles = "...";

export const variantStyles = {
  primary: "...",
  // ... other variants
};

export const sizeStyles = {
  sm: "...",
  md: "...",
  lg: "...",
};
```

### Button.tsx
```typescript
import { ButtonProps } from "./interface";
import { baseStyles, variantStyles, sizeStyles } from "./constant";

export function Button({ variant = "primary", size = "md", ... }: ButtonProps) {
  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </button>
  );
}
```

## Testing Checklist
- [ ] Component renders correctly
- [ ] All variants work
- [ ] All sizes work
- [ ] Disabled state works
- [ ] Click events work
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly

## Notes
- This is a simple refactoring with only constants and interfaces to extract
- The component is mostly presentational
- Constants are extracted for better maintainability


