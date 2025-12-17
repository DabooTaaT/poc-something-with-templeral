# Workflow Versioning System Requirements

## Overview
ระบบ versioning สำหรับ workflow ที่จะเก็บ version อัตโนมัติทุกครั้งที่ save workflow และสามารถดูย้อนหลังและ restore version เก่าได้

## Functional Requirements

### 1. Automatic Versioning
- **FR-1.1**: ระบบต้องสร้าง version ใหม่อัตโนมัติทุกครั้งที่ผู้ใช้ save workflow
- **FR-1.2**: Version number ต้องเพิ่มขึ้นเรื่อยๆ (1, 2, 3, ...) และไม่ลดลง
- **FR-1.3**: แต่ละ version ต้องเก็บข้อมูล:
  - Version number
  - Workflow name ณ เวลานั้น
  - DAG structure (nodes และ edges)
  - Timestamp ที่สร้าง version

### 2. Version History Viewing
- **FR-2.1**: ผู้ใช้สามารถดูรายการ versions ทั้งหมดของ workflow ได้
- **FR-2.2**: แต่ละ version ในรายการต้องแสดง:
  - Version number
  - Date และ time ที่สร้าง
  - Workflow name
- **FR-2.3**: ผู้ใช้สามารถดูรายละเอียดของ version ใดๆ ได้ (nodes, edges)
- **FR-2.4**: ต้อง highlight version ปัจจุบันในรายการ

### 3. Version Restoration
- **FR-3.1**: ผู้ใช้สามารถ restore workflow ไปใช้ version เก่าได้
- **FR-3.2**: เมื่อ restore version เก่า:
  - ระบบต้องเก็บ workflow ปัจจุบันเป็น version ใหม่ก่อน
  - จากนั้นจึงนำข้อมูลจาก version ที่เลือกมา update workflow
- **FR-3.3**: ต้องมี confirmation dialog ก่อน restore
- **FR-3.4**: หลัง restore สำเร็จ ต้องแสดง workflow ที่ restore แล้ว

## Technical Requirements

### Database Schema

#### Table: `workflow_versions`
```sql
CREATE TABLE workflow_versions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    dag_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_id, version_number)
);

CREATE INDEX idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_versions_workflow_version ON workflow_versions(workflow_id, version_number);
```

### Backend API Endpoints

#### 1. List Workflow Versions
- **Endpoint**: `GET /api/v1/workflows/:id/versions`
- **Response**:
```json
{
  "versions": [
    {
      "id": "uuid",
      "workflowId": "uuid",
      "versionNumber": 3,
      "name": "My Workflow",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 3,
  "currentVersion": 3
}
```

#### 2. Get Specific Version
- **Endpoint**: `GET /api/v1/workflows/:id/versions/:version`
- **Response**:
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "versionNumber": 2,
  "name": "My Workflow",
  "nodes": [...],
  "edges": [...],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 3. Restore Version
- **Endpoint**: `POST /api/v1/workflows/:id/restore/:version`
- **Response**:
```json
{
  "id": "uuid",
  "name": "My Workflow",
  "nodes": [...],
  "edges": [...],
  "version": 4,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Backend Implementation

#### Models
- เพิ่ม `WorkflowVersion` struct ใน `backend/internal/db/models/workflow.go`
- เพิ่ม `version` field (optional) ใน `Workflow` response

#### Service Layer
- แก้ไข `UpdateWorkflow()` ใน `backend/internal/service/workflow_service.go`:
  - ก่อน update ให้ดึง workflow ปัจจุบัน
  - คำนวณ version number ใหม่ (max version + 1)
  - เก็บ version เก่าเข้า `workflow_versions` table
  - แล้วค่อย update workflow
- เพิ่ม methods:
  - `ListWorkflowVersions(ctx, workflowID)`
  - `GetWorkflowVersion(ctx, workflowID, versionNumber)`
  - `RestoreWorkflowVersion(ctx, workflowID, versionNumber)`

#### Handlers
- เพิ่ม handlers ใน `backend/internal/api/handlers/workflow.go`:
  - `ListVersions(c *gin.Context)`
  - `GetVersion(c *gin.Context)`
  - `RestoreVersion(c *gin.Context)`

### Frontend Implementation

#### Types
- เพิ่ม `WorkflowVersion` interface ใน `frontend/lib/types/dag.ts`:
```typescript
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  name: string;
  nodes?: Node[];
  edges?: Edge[];
  createdAt: string;
}
```

#### API Client
- เพิ่ม methods ใน `frontend/lib/api/client.ts`:
  - `listWorkflowVersions(workflowId: string)`
  - `getWorkflowVersion(workflowId: string, versionNumber: number)`
  - `restoreWorkflowVersion(workflowId: string, versionNumber: number)`

#### Hooks
- เพิ่ม state และ functions ใน `frontend/hooks/useWorkflow.ts`:
  - `versions: WorkflowVersion[]`
  - `currentVersion: number`
  - `loadVersions(workflowId)`
  - `loadVersion(workflowId, versionNumber)`
  - `restoreVersion(workflowId, versionNumber)`

#### UI Components

##### VersionHistory Component
- **Location**: `frontend/components/workflow/VersionHistory.tsx`
- **Features**:
  - แสดงรายการ versions (table หรือ list)
  - แสดง version number, date/time, workflow name
  - Highlight version ปัจจุบัน
  - ปุ่ม "View" สำหรับดู version
  - ปุ่ม "Restore" สำหรับ restore version
  - Confirmation dialog ก่อน restore

##### Integration in Main Page
- แก้ไข `frontend/app/page.tsx`:
  - เพิ่ม UI section สำหรับ version history
  - แสดง version number ปัจจุบันใน workflow editor
  - เพิ่มปุ่ม/เมนูสำหรับเปิด version history panel
  - Handle restore และ refresh workflow หลัง restore

## User Flow

### Save Workflow (Auto Versioning)
1. ผู้ใช้แก้ไข workflow
2. กดปุ่ม "Save"
3. ระบบ validate workflow
4. ระบบเก็บ version เก่า (ถ้ามี) เข้า `workflow_versions`
5. ระบบ update workflow และเพิ่ม version number
6. แสดง success message

### View Version History
1. ผู้ใช้เปิด workflow
2. กดปุ่ม "Version History"
3. ระบบแสดงรายการ versions ทั้งหมด
4. ผู้ใช้สามารถคลิกดู version ใดๆ ได้

### Restore Version
1. ผู้ใช้เปิด version history
2. เลือก version ที่ต้องการ restore
3. กดปุ่ม "Restore"
4. ระบบแสดง confirmation dialog
5. ผู้ใช้ยืนยัน
6. ระบบเก็บ workflow ปัจจุบันเป็น version ใหม่
7. ระบบ restore ข้อมูลจาก version ที่เลือก
8. ระบบ refresh workflow editor แสดงข้อมูลที่ restore แล้ว

## Data Flow

```
User Action: Save Workflow
  ↓
Frontend: PUT /workflows/:id
  ↓
Backend: UpdateWorkflow()
  ├─ Get current workflow
  ├─ Calculate new version number
  ├─ Insert current state into workflow_versions
  └─ Update workflows table
  ↓
Backend: Return updated workflow
  ↓
Frontend: Refresh UI, show success
```

```
User Action: Restore Version
  ↓
Frontend: POST /workflows/:id/restore/:version
  ↓
Backend: RestoreWorkflowVersion()
  ├─ Get version to restore
  ├─ Get current workflow
  ├─ Save current as new version
  └─ Update workflows with restored data
  ↓
Backend: Return restored workflow
  ↓
Frontend: Load restored workflow, refresh UI
```

## Migration Strategy

### Database Migration
1. สร้าง migration file: `backend/internal/db/migrations/002_add_workflow_versions.sql`
2. Run migration: `./scripts/migrate.sh`

### Backward Compatibility
- Workflow ที่มีอยู่แล้วจะไม่มี version history
- Version 1 จะถูกสร้างเมื่อมีการ update ครั้งแรก
- หรือสามารถสร้าง initial version สำหรับ workflow ที่มีอยู่แล้ว

## Testing Considerations

### Backend Tests
- Test version creation on workflow update
- Test version numbering sequence
- Test version listing
- Test version retrieval
- Test version restoration
- Test concurrent updates

### Frontend Tests
- Test version history display
- Test version selection
- Test restore confirmation flow
- Test UI refresh after restore

## Future Enhancements (Out of Scope)
- Version comparison (diff view)
- Version tagging/labeling
- Version deletion
- Version export/import
- Automatic cleanup of old versions

