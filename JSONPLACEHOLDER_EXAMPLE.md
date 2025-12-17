# ตัวอย่างการใช้งาน JSONPlaceholder API

## API Endpoint
`https://jsonplaceholder.typicode.com/posts`

## Response Structure
API นี้ return **array โดยตรง** (ไม่ใช่ object ที่มี nested data):

```json
[
  {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
    "body": "quia et suscipit..."
  },
  {
    "userId": 1,
    "id": 2,
    "title": "qui est esse",
    "body": "est rerum tempore vitae..."
  },
  ...
]
```

## HTTP Node Response Structure

เมื่อ HTTP Node call API นี้ response structure จะเป็น:

```json
{
  "status_code": 200,
  "headers": {...},
  "body": "[...]",
  "data": [
    {
      "userId": 1,
      "id": 1,
      "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
      "body": "..."
    },
    ...
  ]
}
```

**⚠️ สำคัญ:** `response.data` เป็น **array โดยตรง** (ไม่ใช่ `response.data.data`)

## Code Node - Transform Array

### ตัวอย่างที่ 1: Return `[{test: title}]`

**Code:**
```javascript
const posts = response && response.data;
if (Array.isArray(posts)) {
  return posts.map(post => ({ test: post.title }));
}
return [];
```

**Output:**
```json
[
  { "test": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit" },
  { "test": "qui est esse" },
  { "test": "ea molestias quasi exercitationem repellat qui ipsa sit aut" },
  ...
]
```

### ตัวอย่างที่ 2: Filter และ Transform

**Code:**
```javascript
const posts = response && response.data;
if (Array.isArray(posts)) {
  return posts
    .filter(post => post.userId === 1)
    .map(post => ({ 
      test: post.title,
      id: post.id 
    }));
}
return [];
```

### ตัวอย่างที่ 3: Transform ทั้ง Object

**Code:**
```javascript
const posts = response && response.data;
if (Array.isArray(posts)) {
  return posts.map(post => ({
    test: post.title,
    userId: post.userId,
    body: post.body
  }));
}
return [];
```

### ตัวอย่างที่ 4: Get First Item Only

**Code:**
```javascript
const posts = response && response.data;
if (Array.isArray(posts) && posts.length > 0) {
  return [{ test: posts[0].title }];
}
return [];
```

## ข้อควรระวัง

1. **ตรวจสอบว่าเป็น Array:** ใช้ `Array.isArray()` ก่อนใช้ `.map()`
2. **Array Response:** API ที่ return array โดยตรง จะอยู่ใน `response.data` โดยตรง (ไม่ใช่ `response.data.data`)
3. **Object Response:** API ที่ return object จะอยู่ใน `response.data.data` (nested)

## เปรียบเทียบ

### Array Response (เช่น jsonplaceholder.typicode.com/posts)
```javascript
// response.data เป็น array โดยตรง
const posts = response.data;
posts.map(post => post.title);
```

### Object Response (เช่น mock-something)
```javascript
// response.data.data เป็น object
const data = response.data.data;
return { name: data.name };
```

