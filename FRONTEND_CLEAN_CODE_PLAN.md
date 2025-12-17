# แผนการปรับปรุง Clean Code สำหรับ Frontend

## 📊 สรุปการวิเคราะห์

### ปัญหาหลักที่พบ:
1. **page.tsx ใหญ่เกินไป** (782 บรรทัด) - มี JSX มากมาย inline
2. **ใช้ `alert()` แทน Toast/Notification** - ไม่เป็นมิตรกับผู้ใช้
3. **Hardcoded Configuration** - node types config อยู่ใน page.tsx
4. **Component Structure** - ยังแยกได้ดีกว่านี้
5. **Error Handling** - ไม่สม่ำเสมอ ใช้ alert() หลายที่
6. **Magic Strings/Numbers** - มี hardcoded values หลายที่
7. **Code Duplication** - มี logic ที่ซ้ำกัน
8. **Type Safety** - บางจุดใช้ `any` หรือ type assertion

---

## 🎯 แผนการปรับปรุง (Phase by Phase)

### **Phase 1: Extract Components & Configuration** ⭐ Priority: High

#### 1.1 แยก Node Types Configuration
**ปัญหา:** Node types config (429-521 บรรทัดใน page.tsx) hardcoded อยู่ใน component

**แผน:**
```
frontend/
  components/
    canvas/
      NodePalette/
        NodePalette.tsx          # Component สำหรับแสดง node types
        nodeTypesConfig.ts       # Configuration สำหรับ node types
        index.ts
```

**ประโยชน์:**
- แยก configuration ออกจาก UI
- ง่ายต่อการเพิ่ม node type ใหม่
- Reusable และ testable

---

#### 1.2 แยก Header Component
**ปัญหา:** Header (126-193 บรรทัด) อยู่ใน page.tsx

**แผน:**
```
frontend/
  components/
    layout/
      Header/
        Header.tsx               # Header component
        WorkflowNameInput.tsx    # Input field component
        HeaderActions.tsx        # Action buttons group
        index.ts
```

**ประโยชน์:**
- ลดขนาด page.tsx
- แยก concerns
- ง่ายต่อการ maintain

---

#### 1.3 แยก Sidebar Components
**ปัญหา:** History sidebar (264-408 บรรทัด) และ Node palette (411-667 บรรทัด) อยู่ใน page.tsx

**แผน:**
```
frontend/
  components/
    layout/
      Sidebar/
        WorkflowHistorySidebar/
          WorkflowHistorySidebar.tsx
          HistoryItem.tsx
          HistoryPlaceholder.tsx
          index.ts
        NodePaletteSidebar/
          NodePaletteSidebar.tsx
          NodeTypeCard.tsx
          SelectedNodeActions.tsx
          ExecutionStatus.tsx
          index.ts
```

**ประโยชน์:**
- Component structure ชัดเจน
- ง่ายต่อการ test
- Reusable

---

#### 1.4 แยก Alert/Notification Components
**ปัญหา:** ใช้ `alert()` และ inline error messages

**แผน:**
```
frontend/
  components/
    ui/
      Toast/
        Toast.tsx                # Toast component
        ToastContainer.tsx        # Container for toasts
        useToast.ts              # Hook for showing toasts
        index.ts
      Alert/
        Alert.tsx                # Alert banner component
        AlertProvider.tsx        # Context provider
        useAlert.ts              # Hook for alerts
        index.ts
```

**ประโยชน์:**
- UX ดีขึ้น
- Consistent error handling
- Customizable styling

---

### **Phase 2: Improve State Management & Hooks** ⭐ Priority: High

#### 2.1 สร้าง Custom Hooks สำหรับ History Management
**ปัญหา:** History logic อยู่ใน controller.ts

**แผน:**
```
frontend/
  hooks/
    useWorkflowHistory.ts        # History fetching & pagination
    useViewportCache.ts          # Viewport state management
    useUnsavedChanges.ts         # Track unsaved changes
    useWorkflowValidation.ts     # Validation logic
```

**ประโยชน์:**
- แยก logic ออกจาก UI
- Reusable
- ง่ายต่อการ test

---

#### 2.2 ปรับปรุง Error Handling
**ปัญหา:** Error handling ไม่สม่ำเสมอ

**แผน:**
```
frontend/
  lib/
    errors/
      errorHandler.ts            # Centralized error handling
      errorMessages.ts           # Error message constants
      errorTypes.ts              # Error type definitions
```

**ประโยชน์:**
- Consistent error handling
- ง่ายต่อการ maintain
- Better user experience

---

#### 2.3 สร้าง Constants File
**ปัญหา:** Magic strings/numbers กระจัดกระจาย

**แผน:**
```
frontend/
  constants/
    workflow.ts                  # Workflow-related constants
    ui.ts                        # UI constants (colors, sizes)
    api.ts                       # API-related constants
    validation.ts                # Validation constants
```

**ประโยชน์:**
- Single source of truth
- ง่ายต่อการ maintain
- Type-safe

---

### **Phase 3: Refactor Large Files** ⭐ Priority: Medium

#### 3.1 แยก page.tsx เป็น Layout + Sections
**ปัญหา:** page.tsx ใหญ่เกินไป (782 บรรทัด)

**แผน:**
```
frontend/
  app/
    page.tsx                     # Main page (ลดเหลือ ~100 บรรทัด)
    components/
      WorkflowLayout.tsx         # Main layout wrapper
      WorkflowHeader.tsx         # Header section
      WorkflowContent.tsx        # Main content area
      WorkflowFooter.tsx         # Footer section
```

**ประโยชน์:**
- อ่านง่ายขึ้น
- Maintainable
- Testable

---

#### 3.2 แยก controller.ts เป็น Multiple Hooks
**ปัญหา:** controller.ts มี logic มากมาย (440 บรรทัด)

**แผน:**
```
frontend/
  hooks/
    useWorkflowActions.ts        # Save, run, edit actions
    useNodeActions.ts            # Node CRUD operations
    useWorkflowHistory.ts        # History management
    useViewportManagement.ts     # Viewport caching
```

**ประโยชน์:**
- Single Responsibility Principle
- ง่ายต่อการ test
- Reusable

---

### **Phase 4: Improve Type Safety** ⭐ Priority: Medium

#### 4.1 สร้าง Strict Types
**ปัญหา:** บางจุดใช้ `any` หรือ type assertion

**แผน:**
```
frontend/
  lib/
    types/
      workflow.ts                # Workflow types (enhance existing)
      node.ts                    # Node types (enhance existing)
      api.ts                     # API response types
      ui.ts                      # UI component types
```

**ประโยชน์:**
- Type safety
- Better IDE support
- Fewer runtime errors

---

#### 4.2 สร้าง Type Guards
**ปัญหา:** Type checking กระจัดกระจาย

**แผน:**
```
frontend/
  lib/
    utils/
      typeGuards.ts              # Type guard functions
      validators.ts               # Validation utilities
```

**ประโยชน์:**
- Type-safe runtime checks
- Reusable validation

---

### **Phase 5: Code Quality Improvements** ⭐ Priority: Low

#### 5.1 Extract Utility Functions
**ปัญหา:** Utility functions กระจัดกระจาย

**แผน:**
```
frontend/
  lib/
    utils/
      formatting.ts               # formatRelativeTime, etc.
      workflow.ts                 # Workflow utilities
      snapshot.ts                 # Snapshot utilities
      viewport.ts                 # Viewport utilities
```

**ประโยชน์:**
- Reusable utilities
- ง่ายต่อการ test
- Consistent behavior

---

#### 5.2 สร้าง Custom Hooks สำหรับ Common Patterns
**ปัญหา:** มี pattern ที่ซ้ำกัน

**แผน:**
```
frontend/
  hooks/
    useAsync.ts                  # Generic async operation hook
    useDebounce.ts                # Debounce hook
    useLocalStorage.ts            # Local storage hook
    useConfirm.ts                 # Confirmation dialog hook
```

**ประโยชน์:**
- DRY principle
- Consistent patterns
- Reusable

---

## 📋 Implementation Order (Recommended)

### **Week 1: Foundation**
1. ✅ สร้าง Toast/Notification system
2. ✅ Extract constants
3. ✅ สร้าง error handling utilities

### **Week 2: Component Extraction**
4. ✅ แยก Header component
5. ✅ แยก Sidebar components
6. ✅ แยก Node Palette component

### **Week 3: Hook Refactoring**
7. ✅ แยก history management hook
8. ✅ แยก workflow actions hooks
9. ✅ แยก viewport management hook

### **Week 4: Large File Refactoring**
10. ✅ แยก page.tsx เป็น sections
11. ✅ แยก controller.ts เป็น hooks
12. ✅ Improve type safety

### **Week 5: Polish & Optimization**
13. ✅ Extract utility functions
14. ✅ สร้าง custom hooks สำหรับ common patterns
15. ✅ Code review & testing

---

## 🎨 Code Structure After Refactoring

```
frontend/
├── app/
│   ├── page.tsx                 # ~100 lines (main entry)
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── Footer/
│   ├── canvas/
│   │   ├── FlowCanvas/
│   │   ├── NodePalette/
│   │   └── NodeConfigPanel/
│   ├── workflow/
│   │   └── VersionHistory/
│   ├── execution/
│   │   └── ExecutionResult/
│   └── ui/
│       ├── Button/
│       ├── Modal/
│       ├── Toast/
│       └── Alert/
├── hooks/
│   ├── useWorkflow.ts           # Existing
│   ├── useExecution.ts          # Existing
│   ├── useWorkflowHistory.ts    # New
│   ├── useWorkflowActions.ts    # New
│   ├── useNodeActions.ts        # New
│   ├── useViewportCache.ts      # New
│   ├── useUnsavedChanges.ts     # New
│   └── useToast.ts              # New
├── lib/
│   ├── api/
│   ├── dag/
│   ├── types/
│   ├── errors/
│   ├── utils/
│   └── constants/
└── constants/
    ├── workflow.ts
    ├── ui.ts
    └── api.ts
```

---

## 📊 Metrics to Track

### Before Refactoring:
- `page.tsx`: 782 lines
- `controller.ts`: 440 lines
- `alert()` calls: 11 instances
- Hardcoded configs: Multiple locations
- Type safety: Some `any` types

### Target After Refactoring:
- `page.tsx`: < 150 lines
- Largest component: < 300 lines
- `alert()` calls: 0 (replaced with Toast)
- Hardcoded configs: Centralized in constants/
- Type safety: 100% typed, no `any`

---

## ✅ Benefits Summary

1. **Maintainability**: ง่ายต่อการ maintain และ extend
2. **Testability**: Components และ hooks แยกออกมา test ได้ง่าย
3. **Reusability**: Components และ utilities ใช้ซ้ำได้
4. **Type Safety**: Type-safe code ลด runtime errors
5. **User Experience**: Toast notifications แทน alert()
6. **Code Quality**: Clean, readable, และ organized
7. **Performance**: Better code splitting และ lazy loading opportunities

---

## 🚀 Next Steps

1. **Review Plan**: ทีม review และ approve plan
2. **Create Issues**: สร้าง GitHub issues สำหรับแต่ละ phase
3. **Start Phase 1**: เริ่มจาก Toast system และ constants
4. **Incremental Refactoring**: ทำทีละ phase ไม่ refactor ทั้งหมดพร้อมกัน
5. **Testing**: Test หลังแต่ละ phase
6. **Documentation**: Update documentation ตาม refactoring

---

## 📝 Notes

- **ไม่ควร refactor ทั้งหมดพร้อมกัน** - ทำทีละ phase และ test หลังแต่ละ phase
- **Maintain backward compatibility** - ระวัง breaking changes
- **Write tests** - เขียน tests สำหรับ components และ hooks ใหม่
- **Code review** - Review code หลังแต่ละ phase
- **Documentation** - Update docs และ comments ตาม refactoring

