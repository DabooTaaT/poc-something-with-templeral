# View Version Feature Requirements

## Overview
เพิ่มฟีเจอร์ "View Version" เพื่อให้ผู้ใช้สามารถดู version เก่าได้โดยไม่ต้อง restore และยังคงฟีเจอร์ Restore ไว้เหมือนเดิม

## Functional Requirements

### 1. View Version (Read-Only Mode)
- **FR-1.1**: ผู้ใช้สามารถกดปุ่ม "View" เพื่อดู version เก่าได้
- **FR-1.2**: เมื่อ View version เก่า จะแสดงใน canvas แต่ไม่ save เป็น workflow ปัจจุบัน
- **FR-1.3**: ต้องมี indicator แสดงว่าเป็น "View Mode" (ดู version เก่า) หรือ "Current Version"
- **FR-1.4**: เมื่ออยู่ใน View Mode ต้องมีปุ่ม "Back to Current" เพื่อกลับไปดู version ปัจจุบัน
- **FR-1.5**: เมื่ออยู่ใน View Mode ควร disable หรือแจ้งเตือนก่อน save

### 2. Restore Version (Existing Feature)
- **FR-2.1**: ฟีเจอร์ Restore ยังคงทำงานเหมือนเดิม
- **FR-2.2**: เมื่อ Restore จะ save workflow ปัจจุบันเป็น version ใหม่ก่อน restore

## Technical Requirements

### Frontend Implementation

#### 1. useWorkflow Hook (`frontend/hooks/useWorkflow.ts`)

##### New State
```typescript
const [viewingVersion, setViewingVersion] = useState<number | null>(null);
const [isViewMode, setIsViewMode] = useState(false);
const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(null);
```

##### New Functions
- `viewVersion(workflowId: string, versionNumber: number)`: 
  - Load version เพื่อดู (ไม่ restore)
  - เก็บ workflow ปัจจุบันไว้ใน `originalWorkflow`
  - Set `viewingVersion` และ `isViewMode`
  - Update nodes และ edges จาก version ที่เลือก

- `backToCurrentVersion()`:
  - Restore workflow ปัจจุบันจาก `originalWorkflow`
  - Reset `viewingVersion`, `isViewMode`, และ `originalWorkflow`

#### 2. VersionHistory Component (`frontend/components/workflow/VersionHistory.tsx`)

##### UI Changes
- เพิ่มปุ่ม "View" ข้างๆ ปุ่ม "Restore" สำหรับแต่ละ version
- แสดง indicator เมื่อ version ที่กำลังดูอยู่ (highlight row)
- เพิ่ม prop `onView: (versionNumber: number) => void`
- แสดง "Currently Viewing: v{versionNumber}" เมื่ออยู่ใน View Mode

##### Button Layout
```
Version | Name | Created At | Actions
--------|------|------------|----------
v3      | ...  | ...        | [View] [Restore]
v2      | ...  | ...        | [View] [Restore]
v1      | ...  | ...        | [View] (Current)
```

#### 3. Main Page (`frontend/app/page.tsx`)

##### View Mode Indicator
- แสดง banner หรือ badge เมื่ออยู่ใน View Mode:
  ```tsx
  {isViewMode && viewingVersion && (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Viewing Version {viewingVersion} (Read-Only)
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            You are viewing a previous version. Changes will not be saved.
          </p>
        </div>
        <Button onClick={backToCurrentVersion} variant="outline" size="sm">
          Back to Current Version
        </Button>
      </div>
    </div>
  )}
  ```

##### Save Protection
- เมื่ออยู่ใน View Mode:
  - Disable ปุ่ม "Save" หรือ
  - แสดง confirmation dialog: "You are viewing a previous version. Switch back to current version to save changes."

##### Integration
- Pass `onView` handler to VersionHistory component
- Handle `viewVersion` และ `backToCurrentVersion` callbacks

## User Flow

### View Version Flow
1. ผู้ใช้เปิด Version History
2. เลือก version ที่ต้องการดู
3. กดปุ่ม "View"
4. ระบบแสดง version นั้นใน canvas
5. แสดง indicator "Viewing Version X (Read-Only)"
6. ผู้ใช้สามารถดู nodes และ edges ได้
7. ผู้ใช้กด "Back to Current Version" เพื่อกลับไปดู version ปัจจุบัน

### Restore Version Flow (Existing)
1. ผู้ใช้เปิด Version History
2. เลือก version ที่ต้องการ restore
3. กดปุ่ม "Restore"
4. ระบบแสดง confirmation dialog
5. ผู้ใช้ยืนยัน
6. ระบบเก็บ workflow ปัจจุบันเป็น version ใหม่
7. ระบบ restore ข้อมูลจาก version ที่เลือก
8. ระบบ refresh workflow editor

## UI/UX Considerations

### View Mode Indicator
- ใช้สีเหลือง/amber เพื่อแยกจาก current version (สีน้ำเงิน)
- แสดงข้อความชัดเจนว่าเป็น "Read-Only" mode
- ปุ่ม "Back to Current" ต้องเด่นชัด

### Button States
- **View Button**: 
  - สีเทาหรือ outline style
  - Text: "View"
  - Disabled เมื่อกำลัง view version นั้นอยู่แล้ว

- **Restore Button**:
  - สีน้ำเงิน (primary)
  - Text: "Restore"
  - ต้องมี confirmation dialog

### Visual Feedback
- Highlight row ของ version ที่กำลัง view อยู่
- แสดง badge "Currently Viewing" ใน row นั้น
- Disable หรือ gray out ปุ่ม "View" สำหรับ version ที่กำลัง view อยู่

## Data Flow

```
User Action: View Version
  ↓
Frontend: viewVersion(workflowId, versionNumber)
  ├─ Save current workflow to originalWorkflow
  ├─ Call API: GET /workflows/:id/versions/:version
  ├─ Parse version data (nodes, edges)
  └─ Update nodes and edges state
  ↓
Frontend: Display version in canvas
  ├─ Show "View Mode" indicator
  └─ Disable/Protect save functionality
```

```
User Action: Back to Current
  ↓
Frontend: backToCurrentVersion()
  ├─ Restore nodes and edges from originalWorkflow
  ├─ Reset viewingVersion to null
  ├─ Reset isViewMode to false
  └─ Clear originalWorkflow
  ↓
Frontend: Display current version
  └─ Hide "View Mode" indicator
```

## Implementation Details

### State Management
- `originalWorkflow`: เก็บ workflow ปัจจุบันก่อน view version เพื่อ restore กลับมาได้
- `viewingVersion`: เก็บ version number ที่กำลัง view อยู่
- `isViewMode`: flag เพื่อบอกว่าเป็น view mode หรือไม่

### API Usage
- ใช้ `getWorkflowVersion()` API ที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่)
- ไม่ต้องเรียก API เพิ่มเติมเมื่อ back to current (ใช้ state ที่เก็บไว้)

### Edge Cases
- ถ้าผู้ใช้ view version แล้วปิด Version History modal ยังคงอยู่ใน View Mode
- ถ้าผู้ใช้ view version แล้ว refresh page ต้องกลับไป current version
- ถ้าผู้ใช้ view version แล้ว load workflow อื่น ต้อง reset view mode

## Testing Considerations

### Test Cases
1. View version และ verify ว่าแสดงข้อมูลถูกต้อง
2. View version แล้วกด "Back to Current" verify ว่ากลับมา version ปัจจุบัน
3. View version แล้วพยายาม save ต้องแจ้งเตือนหรือ disable
4. View version แล้ว restore version อื่น ต้องทำงานถูกต้อง
5. View version แล้ว refresh page ต้อง reset เป็น current version

## Future Enhancements (Out of Scope)
- Compare versions side-by-side
- Export version as JSON
- View version diff/changes

