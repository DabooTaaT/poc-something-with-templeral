# Code Node Requirements

## Overview
เพิ่ม Code Node เพื่อให้ผู้ใช้สามารถเขียน JavaScript code เพื่อจัดการ/transform response จาก node ก่อนหน้า (เช่น HTTP node) ก่อนส่งต่อไปยัง node ถัดไป (เช่น Output node)

## Functional Requirements

### 1. Code Node Placement
- **FR-1.1**: Code Node สามารถวางได้ระหว่าง HTTP Node และ Output Node
- **FR-1.2**: Code Node สามารถรับ input จาก node ใดๆ ที่มี output (เช่น HTTP Node, Start Node)
- **FR-1.3**: Code Node สามารถส่ง output ไปยัง node ใดๆ ที่รับ input (เช่น Output Node, Code Node อื่น)
- **FR-1.4**: ถ้าไม่มี Code Node ใน workflow ให้ทำงานแบบ passthrough (ส่ง response จาก HTTP ไป Output โดยตรง)

### 2. Code Execution
- **FR-2.1**: Code Node ต้องรับ response จาก node ก่อนหน้าเป็น input
- **FR-2.2**: ผู้ใช้สามารถเขียน JavaScript code เพื่อ transform data
- **FR-2.3**: Code ต้อง return ค่าที่จะส่งต่อไปยัง node ถัดไป
- **FR-2.4**: ถ้า Code Node ไม่มี code หรือ code ว่างเปล่า ให้ทำ passthrough (ส่ง input ไป output โดยไม่แก้ไข)

### 3. Data Flow
- **FR-3.1**: Input จาก node ก่อนหน้าจะถูกส่งมาในตัวแปร `response` หรือ `data`
- **FR-3.2**: Code สามารถเข้าถึงข้อมูลจาก response เช่น `response.data`, `response.status`
- **FR-3.3**: Output จาก Code Node จะถูกส่งต่อไปยัง node ถัดไป

### 4. Error Handling
- **FR-4.1**: ถ้า code มี syntax error ต้องแสดง error message ที่ชัดเจน
- **FR-4.2**: ถ้า code runtime error (เช่น undefined variable) ต้อง catch และแสดง error
- **FR-4.3**: ถ้า code ไม่ return ค่า ต้องถือว่าเป็น error
- **FR-4.4**: Error จาก Code Node ต้องทำให้ workflow execution fail และแสดง error message

## Technical Requirements

### Frontend Implementation

#### 1. Types (`frontend/lib/types/dag.ts`)

##### Add CodeNodeData Interface
```typescript
export interface CodeNodeData {
  code?: string; // JavaScript code snippet
  label?: string; // Optional label
}
```

##### Update NodeType
```typescript
export type NodeType = 'start' | 'http' | 'code' | 'output';
```

##### Update NodeData Union
```typescript
export type NodeData = StartNodeData | HttpNodeData | CodeNodeData | OutputNodeData;
```

##### Add Type Guard
```typescript
export function isCodeNode(node: Node): node is Node & { data: CodeNodeData } {
  return node.type === 'code';
}
```

#### 2. Code Node Component (`frontend/components/canvas/CodeNode.tsx`)
- สร้าง component สำหรับแสดง Code Node บน canvas
- ใช้สีที่แตกต่างจาก node อื่น (เช่น สีม่วง/indigo)
- แสดง icon หรือ label "Code"
- รองรับ selected state และ hover effects

#### 3. Node Config Panel (`frontend/components/canvas/NodeConfigPanel.tsx`)
- เพิ่ม UI สำหรับ Code Node:
  - Code editor (textarea หรือ monaco editor) สำหรับเขียน JavaScript
  - Syntax highlighting (ถ้าใช้ monaco editor)
  - Line numbers
  - Placeholder text: `const data = response; // response from previous node\nreturn data;`
  - Error display area (แสดง syntax/runtime errors)
  - Preview/Test button (optional)

#### 4. Custom Nodes (`frontend/components/canvas/CustomNodes.tsx`)
- เพิ่ม CodeNode ใน nodeTypes
- Export CodeNode component

#### 5. Validation (`frontend/lib/dag/validation.ts`)
- Code Node ไม่จำเป็นต้องมี validation พิเศษ (optional node)
- แต่ต้อง validate ว่า code เป็น valid JavaScript (optional, client-side)

### Backend Implementation

#### 1. Models (`backend/internal/db/models/workflow.go`)

##### Add CodeNodeData Struct
```go
// CodeNodeData represents data for code node
type CodeNodeData struct {
	Code  string `json:"code,omitempty"`
	Label string `json:"label,omitempty"`
}
```

##### Update Node Type Validation
- เพิ่ม "code" เป็น valid node type

#### 2. Temporal Activities (`backend/internal/temporal/activities.go`)

##### Add CodeExecutionActivity
```go
// CodeExecutionInput represents input for code execution activity
type CodeExecutionInput struct {
	Code    string      `json:"code"`
	Input   interface{} `json:"input"` // Response from previous node
}

// CodeExecutionOutput represents output from code execution activity
type CodeExecutionOutput struct {
	Result interface{} `json:"result"`
	Error  string      `json:"error,omitempty"`
}

// CodeExecutionActivity executes JavaScript code
func (a *Activities) CodeExecutionActivity(ctx context.Context, input CodeExecutionInput) (*CodeExecutionOutput, error) {
	// Use JavaScript engine (e.g., goja, otto, or call external service)
	// Execute code with input as 'response' or 'data' variable
	// Return result or error
}
```

**JavaScript Engine Options:**
- **goja**: Pure Go JavaScript engine (recommended)
- **otto**: Go JavaScript engine (deprecated but stable)
- **External service**: Call Node.js service via HTTP

#### 3. Temporal Workflow (`backend/internal/temporal/workflow.go`)

##### Update DAGWorkflow to Handle Code Node
```go
case "code":
	codeData, err := parseCodeData(node.Data)
	if err != nil {
		// Handle error
	}
	
	// If code is empty, passthrough
	if codeData.Code == "" {
		// Passthrough: lastResult remains unchanged
		continue
	}
	
	var codeOutput CodeExecutionOutput
	err = workflow.ExecuteActivity(activityCtx, (*Activities).CodeExecutionActivity, CodeExecutionInput{
		Code:  codeData.Code,
		Input: lastResult,
	}).Get(activityCtx, &codeOutput)
	
	if err != nil || codeOutput.Error != "" {
		// Handle error
		return nil, err
	}
	
	lastResult = codeOutput.Result
```

##### Add parseCodeData Function
```go
func parseCodeData(data interface{}) (*models.CodeNodeData, error) {
	// Similar to parseHTTPData
	// Parse and validate code node data
}
```

#### 4. DAG Schema Update
- อัปเดต README.md เพื่อรวม Code Node ใน node types
- อัปเดต example DAG เพื่อแสดง Code Node

## Data Flow Examples

### Example 1: With Code Node (Transform Data)
**Input from HTTP Node:**
```json
{
  "data": {
    "completed": false,
    "id": 1,
    "lastName": "mock Lastname",
    "name": "mock value",
    "title": "delectus aut autem",
    "userId": 1
  },
  "status": {
    "code": 1000,
    "header": "not error",
    "massage": "hello wold"
  }
}
```

**Code in Code Node:**
```javascript
const data = response; // response from previous node
return { name: data.data.name };
```

**Output to Output Node:**
```json
{
  "name": "mock value"
}
```

### Example 2: Without Code Node (Passthrough)
**Input from HTTP Node:**
```json
{
  "data": {
    "completed": false,
    "id": 1,
    "lastName": "mock Lastname",
    "name": "mock value",
    "title": "delectus aut autem",
    "userId": 1
  },
  "status": {
    "code": 1000,
    "header": "not error",
    "massage": "hello wold"
  }
}
```

**Output to Output Node (same as input):**
```json
{
  "data": {
    "completed": false,
    "id": 1,
    "lastName": "mock Lastname",
    "name": "mock value",
    "title": "delectus aut autem",
    "userId": 1
  },
  "status": {
    "code": 1000,
    "header": "not error",
    "massage": "hello wold"
  }
}
```

### Example 3: Code Node with Empty Code (Passthrough)
**Code in Code Node:**
```javascript
// Empty or no code
```

**Behavior:** Passthrough input to output without modification

## Error Handling

### Frontend Error Handling
1. **Syntax Validation (Client-side)**
   - ใช้ JavaScript parser เพื่อตรวจสอบ syntax ก่อน save
   - แสดง error message ใน config panel
   - Prevent save ถ้ามี syntax error

2. **Runtime Error Display**
   - แสดง error message จาก execution ใน ExecutionResult component
   - Highlight Code Node ที่เกิด error

### Backend Error Handling
1. **Code Execution Errors**
   - Catch JavaScript runtime errors
   - Return error message ใน CodeExecutionOutput
   - Mark execution as FAILED

2. **Error Propagation**
   - Error จาก Code Node ต้องทำให้ workflow execution fail
   - Store error message ใน execution record
   - Return error details ใน API response

## DAG Schema Update

### Updated Node Types
```typescript
export type NodeType = 'start' | 'http' | 'code' | 'output';
```

### Code Node Data Structure
```json
{
  "id": "n_code",
  "type": "code",
  "position": { "x": 500, "y": 100 },
  "data": {
    "code": "const data = response;\nreturn { name: data.data.name };",
    "label": "Transform Data"
  }
}
```

### Example DAG with Code Node
```json
{
  "name": "demo-with-code",
  "version": 1,
  "nodes": [
    {
      "id": "n_start",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {}
    },
    {
      "id": "n_http",
      "type": "http",
      "position": { "x": 350, "y": 100 },
      "data": {
        "method": "GET",
        "url": "https://api.example.com/data"
      }
    },
    {
      "id": "n_code",
      "type": "code",
      "position": { "x": 600, "y": 100 },
      "data": {
        "code": "const data = response;\nreturn { name: data.data.name };"
      }
    },
    {
      "id": "n_output",
      "type": "output",
      "position": { "x": 850, "y": 100 },
      "data": {}
    }
  ],
  "edges": [
    { "id": "e1", "source": "n_start", "target": "n_http" },
    { "id": "e2", "source": "n_http", "target": "n_code" },
    { "id": "e3", "source": "n_code", "target": "n_output" }
  ]
}
```

## Implementation Details

### JavaScript Engine Selection

#### Option 1: goja (Recommended)
- Pure Go JavaScript engine
- Fast and lightweight
- Good for server-side execution
- Installation: `go get github.com/dop251/goja`

#### Option 2: External Node.js Service
- Call Node.js service via HTTP
- More compatible with modern JavaScript
- Requires separate service
- Better for complex JavaScript features

#### Option 3: otto
- Go JavaScript engine
- Deprecated but stable
- Limited ES6 support

**Recommendation:** ใช้ goja สำหรับ POC

### Code Execution Context
```javascript
// Available variables in code execution:
const response = <input from previous node>; // Main input
const data = response; // Alias for convenience

// Code must return a value:
return <transformed data>;
```

### Security Considerations
1. **Sandboxing**: Code execution ต้องถูก sandbox เพื่อป้องกัน:
   - File system access
   - Network access (except through workflow)
   - System commands
   - Infinite loops (timeout)

2. **Resource Limits**:
   - Execution timeout (e.g., 5 seconds)
   - Memory limit
   - CPU limit

3. **Input Validation**:
   - Validate code syntax before execution
   - Sanitize input data

## Testing Scenarios

### Test Case 1: Basic Code Transformation
- **Input**: `{ "data": { "name": "test" } }`
- **Code**: `return { name: response.data.name };`
- **Expected Output**: `{ "name": "test" }`

### Test Case 2: Passthrough (No Code)
- **Input**: `{ "data": { "name": "test" } }`
- **Code**: `""` (empty)
- **Expected Output**: `{ "data": { "name": "test" } }` (unchanged)

### Test Case 3: Syntax Error
- **Code**: `return { name: response.data.name;` (missing closing brace)
- **Expected**: Error message, execution fails

### Test Case 4: Runtime Error
- **Code**: `return { name: response.nonexistent.name };`
- **Expected**: Error message, execution fails

### Test Case 5: No Return Statement
- **Code**: `const x = response.data;`
- **Expected**: Error message (must return value)

### Test Case 6: Complex Transformation
- **Input**: Complex nested object
- **Code**: Multiple lines of JavaScript
- **Expected**: Correct transformation

## UI/UX Considerations

### Code Editor
- ใช้ textarea สำหรับ POC (simple)
- หรือ Monaco Editor สำหรับ production (syntax highlighting, autocomplete)
- Line numbers
- Code formatting (optional)

### Error Display
- แสดง error ใน config panel (red text)
- แสดง error ใน execution result
- Highlight error line (if possible)

### Default Code Template
```javascript
const data = response; // response from previous node
// Your transformation code here
return data;
```

## Migration Strategy

### Database
- ไม่ต้อง migration (code เก็บใน dag_json)
- Existing workflows จะยังทำงานได้ (ไม่มี code node)

### Backward Compatibility
- Workflows ที่ไม่มี code node จะทำงานเหมือนเดิม
- Code node เป็น optional feature

## Future Enhancements (Out of Scope)
- Multiple code languages (Python, etc.)
- Code libraries/imports
- Code testing/debugging tools
- Code versioning
- Code templates/snippets
- Visual code builder

