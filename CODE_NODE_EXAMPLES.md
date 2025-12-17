# Code Node - ตัวอย่างการใช้งาน

## วิธีเขียน Code ใน Code Node

### ตัวแปรที่ใช้ได้
- `response` - ข้อมูลจาก node ก่อนหน้า (เช่น HTTP Node)
- `data` - alias ของ `response` (ใช้ได้เหมือนกัน)

### กฎการเขียน Code

1. **ต้อง return ค่า** - Code ต้อง return ค่า (object, array, string, number, etc.)
2. **ถ้าไม่มี return** - ระบบจะเพิ่ม `return response;` ให้อัตโนมัติ
3. **ถ้า code ว่าง** - ข้อมูลจะผ่านไปโดยไม่แก้ไข (passthrough mode)

---

## ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: Passthrough (ส่งข้อมูลผ่านโดยไม่แก้ไข)

**Code ใน Code Node:**
```javascript
const data = response;
return data;
```

**Output:** ข้อมูลเดิมจะผ่านไปโดยไม่แก้ไข

---

### ตัวอย่างที่ 2: Extract ข้อมูลจาก HTTP Response

**⚠️ สำคัญ:** HTTP Node response structure มี nested `data`:
```json
{
  "status_code": 200,
  "data": {
    "data": {
      "userId": 1,
      "id": 1,
      "title": "delectus aut autem",
      "completed": false,
      "name": "mock value",
      "lastName": "mock Lastname"
    },
    "status": {
      "code": 1000,
      "header": "not error",
      "massage": "hello wold"
    }
  },
  "body": "..."
}
```

**Code ใน Code Node (วิธีที่ถูกต้อง):**
```javascript
// ใช้ response.data.data เพื่อเข้าถึงข้อมูลจริง
const data = response && response.data && response.data.data;
return {
  name: data.name,
  lastName: data.lastName
};
```

**Output:**
```json
{
  "name": "mock value",
  "lastName": "mock Lastname"
}
```

**❌ ผิด:**
```javascript
// ผิด - response.data ไม่มี name โดยตรง
const data = response && response.data;
return {
  name: data.name  // จะได้ null เพราะ data.name ไม่มี
};
```

**✅ ถูก:**
```javascript
// ถูก - ใช้ response.data.data
const data = response && response.data && response.data.data;
return {
  name: data.name  // จะได้ "mock value"
};
```

---

### ตัวอย่างที่ 3: Transform โครงสร้างข้อมูล

**Code:**
```javascript
const data = response.data;
return {
  user: {
    id: data.userId,
    fullName: data.name + " " + data.lastName,
    completed: data.completed
  },
  status: response.status
};
```

**Output:**
```json
{
  "user": {
    "id": 1,
    "fullName": "mock value mock Lastname",
    "completed": false
  },
  "status": {
    "code": 1000,
    "header": "not error",
    "massage": "hello wold"
  }
}
```

---

### ตัวอย่างที่ 4: Filter ข้อมูล (Array)

**⚠️ สำคัญ:** `.map()`, `.filter()`, `.forEach()` ใช้ได้กับ **Array เท่านั้น**

**Code (ถ้า data เป็น array):**
```javascript
// ตรวจสอบว่าเป็น array ก่อน
const items = response && response.data && response.data.data;
if (Array.isArray(items)) {
  return items.filter(item => item.completed === false);
}
return [];
```

**❌ ผิด (ถ้า data เป็น object):**
```javascript
// ผิด - data เป็น object ไม่ใช่ array
const data = response && response.data && response.data.data;
return data.map(item => item.name);  // Error: Object has no member 'map'
```

**✅ ถูก (ถ้าต้องการ transform object):**
```javascript
// ถูก - transform object properties
const data = response && response.data && response.data.data;
if (data) {
  return {
    name: data.name,
    lastName: data.lastName
  };
}
return {};
```

---

### ตัวอย่างที่ 5: ใช้ data แทน response

**Code:**
```javascript
// ใช้ data แทน response ได้ (เหมือนกัน)
return {
  name: data.data.name,
  lastName: data.data.lastName
};
```

---

### ตัวอย่างที่ 6: ไม่มี return statement

**Code:**
```javascript
// ไม่มี return - ระบบจะเพิ่ม return response; ให้อัตโนมัติ
const processed = response.data;
// ข้อมูลจะผ่านไปโดยไม่แก้ไข
```

**ผลลัพธ์:** ข้อมูลเดิมจะผ่านไป (เหมือน passthrough)

---

### ตัวอย่างที่ 7: Passthrough Mode

**Code:**
```
(ว่างเปล่า - ไม่มี code)
```

**ผลลัพธ์:** ข้อมูลจาก node ก่อนหน้าจะผ่านไปโดยไม่แก้ไข

---

## ⚠️ ข้อจำกัดสำคัญ

### Optional Chaining (`?.`) ไม่รองรับ

**goja (JavaScript runtime) ไม่รองรับ optional chaining (`?.`)** ซึ่งเป็น ES2020 feature

**❌ ผิด:**
```javascript
const data = response?.data;
return data;
```

**✅ ถูก (ใช้ if/else):**
```javascript
const data = response && response.data ? response.data : {};
return data;
```

**✅ หรือ (ถ้าแน่ใจว่ามี data):**
```javascript
const data = response.data;
return data;
```

---

## ข้อผิดพลาดที่พบบ่อย

### ❌ Error: "syntax error" - Optional chaining

**สาเหตุ:** ใช้ optional chaining (`?.`) ซึ่งไม่รองรับ

**แก้ไข:** ใช้ if/else แทน
```javascript
// ❌ ผิด
const data = response?.data;

// ✅ ถูก
const data = response && response.data ? response.data : null;
```

---

### ❌ Error: "code must return a value"

**สาเหตุ:** Code ไม่ return ค่า และไม่มี return statement

**แก้ไข:** เพิ่ม `return` statement
```javascript
// ❌ ผิด
const result = response.data;

// ✅ ถูก
const result = response.data;
return result;
```

---

### ❌ Error: "code execution error: runtime error: TypeError: Object has no member 'map'"

**สาเหตุ:** พยายามใช้ Array method (เช่น `.map()`, `.filter()`, `.forEach()`) บน object ที่ไม่ใช่ array

**ตัวอย่าง:**
```javascript
// ❌ ผิด - data เป็น object ไม่ใช่ array
const data = response && response.data && response.data.data;
return data.map(item => item.name);  // Error!

// ✅ ถูก - ตรวจสอบว่าเป็น array ก่อน
const items = response && response.data && response.data.data;
if (Array.isArray(items)) {
  return items.map(item => item.name);
}
return [];

// ✅ หรือ transform object properties
const data = response && response.data && response.data.data;
return {
  name: data.name,
  lastName: data.lastName
};
```

---

### ❌ Error: "code execution error"

**สาเหตุ:** 
- Syntax error
- Runtime error (เช่น undefined variable)
- Type error

**ตัวอย่าง:**
```javascript
// ❌ ผิด - undefined variable
return unknownVariable;

// ✅ ถูก
return response.data;
```

---

### ❌ Error: "code execution timeout (5s)"

**สาเหตุ:** Code ทำงานนานเกิน 5 วินาที

**แก้ไข:** ลดความซับซ้อนของ code หรือแยกเป็นหลาย node

---

## Tips

1. **ใช้ console.log ไม่ได้** - Code Node ไม่รองรับ console.log
2. **Timeout 5 วินาที** - Code ต้องทำงานเสร็จภายใน 5 วินาที
3. **JavaScript ES5** - ใช้ JavaScript ES5 syntax (ไม่รองรับ ES6+ features บางอย่าง)
4. **Test ก่อน Run** - ตรวจสอบ syntax และ logic ก่อน run workflow

---

## ตัวอย่าง Workflow

```
Start Node → HTTP Node → Code Node → Output Node
```

**HTTP Node Response:**
```json
{
  "data": {
    "name": "John",
    "age": 30
  }
}
```

**Code Node:**
```javascript
return {
  message: `Hello ${response.data.name}, you are ${response.data.age} years old`,
  timestamp: new Date().toISOString()
};
```

**Output:**
```json
{
  "message": "Hello John, you are 30 years old",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

