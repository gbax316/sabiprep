# SabiPrep Admin API Reference

Complete reference for all Admin Portal API endpoints.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Dashboard APIs](#dashboard-apis)
3. [User Management APIs](#user-management-apis)
4. [Content Management APIs](#content-management-apis)
5. [Question Bank APIs](#question-bank-apis)
6. [CSV Import APIs](#csv-import-apis)
7. [Error Codes](#error-codes)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

All admin API endpoints require authentication using Supabase JWT tokens.

### Headers

Include the following headers in all requests:

```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

### Getting the Token

```javascript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Role Requirements

| Role | Access Level |
|------|--------------|
| student | No admin access |
| tutor | Content management only |
| admin | Full access |

---

## Dashboard APIs

### Get Dashboard Statistics

Retrieves comprehensive statistics for the admin dashboard.

**Endpoint**: `GET /api/admin/dashboard`

**Authentication**: Required (tutor or admin)

**Response**:

```json
{
  "users": {
    "total": 1250,
    "students": 1150,
    "tutors": 95,
    "admins": 5,
    "growth": {
      "daily": 15,
      "weekly": 87,
      "monthly": 340
    }
  },
  "content": {
    "subjects": 12,
    "topics": 156,
    "questions": 4580,
    "byStatus": {
      "active": 4200,
      "draft": 350,
      "archived": 30
    }
  },
  "activity": {
    "totalSessions": 25600,
    "averageScore": 72.5,
    "completionRate": 85.3,
    "recentSessions": [
      {
        "id": "session-123",
        "userId": "user-456",
        "score": 85,
        "completedAt": "2024-12-16T10:30:00Z"
      }
    ]
  }
}
```

**Example Request**:

```javascript
const response = await fetch('/api/admin/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const stats = await response.json();
console.log(`Total users: ${stats.users.total}`);
```

**Error Responses**:

- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User doesn't have admin/tutor role
- `500 Internal Server Error`: Database error

---

### Get System Alerts

Retrieves important system alerts and warnings.

**Endpoint**: `GET /api/admin/dashboard/alerts`

**Authentication**: Required (tutor or admin)

**Response**:

```json
{
  "alerts": [
    {
      "id": "alert-1",
      "type": "warning",
      "message": "3 topics have fewer than 10 questions",
      "severity": "medium",
      "createdAt": "2024-12-16T10:00:00Z"
    },
    {
      "id": "alert-2",
      "type": "error",
      "message": "Database backup failed",
      "severity": "high",
      "createdAt": "2024-12-16T09:00:00Z"
    }
  ],
  "count": 2
}
```

**Alert Types**:
- `info`: Informational messages
- `warning`: Issues requiring attention
- `error`: Critical errors

**Severity Levels**:
- `low`: Minor issues
- `medium`: Important but not urgent
- `high`: Requires immediate attention

---

## User Management APIs

### List All Users

Retrieves a paginated list of users.

**Endpoint**: `GET /api/admin/users`

**Authentication**: Required (admin only)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page |
| role | string | No | all | Filter by role (student/tutor/admin) |
| search | string | No | - | Search by name or email |

**Response**:

```json
{
  "users": [
    {
      "id": "user-id-123",
      "email": "student@example.com",
      "full_name": "John Doe",
      "role": "student",
      "phone": "+234 123 456 7890",
      "school": "Example High School",
      "class": "SS3",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-12-16T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Example Request**:

```javascript
const response = await fetch('/api/admin/users?page=1&limit=20&role=student', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { users, pagination } = await response.json();
```

---

### Get User Details

Retrieves detailed information about a specific user.

**Endpoint**: `GET /api/admin/users/[userId]`

**Authentication**: Required (admin only)

**Response**:

```json
{
  "user": {
    "id": "user-id-123",
    "email": "student@example.com",
    "full_name": "John Doe",
    "role": "student",
    "phone": "+234 123 456 7890",
    "school": "Example High School",
    "class": "SS3",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-12-16T10:00:00Z"
  },
  "stats": {
    "totalSessions": 45,
    "averageScore": 78.5,
    "completionRate": 88.9,
    "lastActive": "2024-12-16T09:30:00Z"
  }
}
```

---

### Create User

Creates a new user account.

**Endpoint**: `POST /api/admin/users`

**Authentication**: Required (admin only)

**Request Body**:

```json
{
  "email": "newuser@example.com",
  "full_name": "Jane Smith",
  "role": "student",
  "phone": "+234 987 654 3210",
  "school": "Lagos State College",
  "class": "SS2"
}
```

**Required Fields**:
- `email`: Unique email address
- `full_name`: User's full name
- `role`: One of: student, tutor, admin

**Optional Fields**:
- `phone`: Phone number
- `school`: School name
- `class`: Class/grade level

**Response**:

```json
{
  "user": {
    "id": "new-user-id",
    "email": "newuser@example.com",
    "full_name": "Jane Smith",
    "role": "student",
    "created_at": "2024-12-16T10:00:00Z"
  },
  "temporaryPassword": "generated-password-123"
}
```

⚠️ **Important**: Save the temporary password to share with the user.

**Example Request**:

```javascript
const response = await fetch('/api/admin/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    full_name: 'Jane Smith',
    role: 'student'
  })
});

const { user, temporaryPassword } = await response.json();
console.log(`User created with password: ${temporaryPassword}`);
```

---

### Update User

Updates an existing user's information.

**Endpoint**: `PUT /api/admin/users/[userId]`

**Authentication**: Required (admin only)

**Request Body**:

```json
{
  "full_name": "Jane Smith Updated",
  "role": "tutor",
  "phone": "+234 111 222 3333",
  "school": "Updated School",
  "class": "SS3"
}
```

**Response**:

```json
{
  "user": {
    "id": "user-id-123",
    "email": "user@example.com",
    "full_name": "Jane Smith Updated",
    "role": "tutor",
    "updated_at": "2024-12-16T10:05:00Z"
  }
}
```

⚠️ **Note**: Email cannot be changed through this endpoint.

---

### Delete User

Deletes a user account.

**Endpoint**: `DELETE /api/admin/users/[userId]`

**Authentication**: Required (admin only)

**Response**:

```json
{
  "message": "User deleted successfully",
  "deletedUserId": "user-id-123"
}
```

⚠️ **Warning**: This action cannot be undone. All user data will be permanently deleted.

---

### Reset User Password

Generates a new temporary password for a user.

**Endpoint**: `POST /api/admin/users/[userId]/reset-password`

**Authentication**: Required (admin only)

**Response**:

```json
{
  "message": "Password reset successfully",
  "temporaryPassword": "new-generated-password-456",
  "userId": "user-id-123"
}
```

**Example Request**:

```javascript
const response = await fetch('/api/admin/users/user-123/reset-password', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

const { temporaryPassword } = await response.json();
// Share this password securely with the user
```

---

## Content Management APIs

### Subjects

#### List All Subjects

**Endpoint**: `GET /api/admin/subjects`

**Authentication**: Required (tutor or admin)

**Response**:

```json
{
  "subjects": [
    {
      "id": "subject-id-123",
      "name": "Mathematics",
      "description": "Core mathematics topics",
      "icon": "📐",
      "order_index": 1,
      "topic_count": 25,
      "question_count": 450,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Create Subject

**Endpoint**: `POST /api/admin/subjects`

**Authentication**: Required (tutor or admin)

**Request Body**:

```json
{
  "name": "Physics",
  "description": "Physical sciences and mechanics",
  "icon": "⚛️",
  "order_index": 5
}
```

**Required**: `name`

**Response**:

```json
{
  "subject": {
    "id": "new-subject-id",
    "name": "Physics",
    "description": "Physical sciences and mechanics",
    "icon": "⚛️",
    "order_index": 5,
    "created_at": "2024-12-16T10:00:00Z"
  }
}
```

---

#### Update Subject

**Endpoint**: `PUT /api/admin/subjects/[subjectId]`

**Authentication**: Required (tutor or admin)

**Request Body**:

```json
{
  "name": "Advanced Physics",
  "description": "Updated description",
  "icon": "🔬"
}
```

**Response**:

```json
{
  "subject": {
    "id": "subject-id",
    "name": "Advanced Physics",
    "updated_at": "2024-12-16T10:05:00Z"
  }
}
```

---

#### Delete Subject

**Endpoint**: `DELETE /api/admin/subjects/[subjectId]`

**Authentication**: Required (tutor or admin)

**Response**:

```json
{
  "message": "Subject deleted successfully",
  "deletedSubjectId": "subject-id"
}
```

⚠️ **Warning**: Cannot delete subjects that have topics. Delete all topics first.

---

### Topics

#### List Topics

**Endpoint**: `GET /api/admin/topics`

**Authentication**: Required (tutor or admin)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| subjectId | string | No | Filter by subject ID |

**Response**:

```json
{
  "topics": [
    {
      "id": "topic-id-123",
      "subject_id": "subject-id-123",
      "name": "Algebra",
      "description": "Basic algebraic concepts",
      "difficulty_level": "beginner",
      "estimated_duration": 45,
      "order_index": 1,
      "question_count": 50,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Create Topic

**Endpoint**: `POST /api/admin/topics`

**Authentication**: Required (tutor or admin)

**Request Body**:

```json
{
  "subject_id": "subject-id-123",
  "name": "Calculus",
  "description": "Introduction to differential calculus",
  "difficulty_level": "advanced",
  "estimated_duration": 60,
  "order_index": 10
}
```

**Required**: `subject_id`, `name`

**Response**:

```json
{
  "topic": {
    "id": "new-topic-id",
    "subject_id": "subject-id-123",
    "name": "Calculus",
    "difficulty_level": "advanced",
    "created_at": "2024-12-16T10:00:00Z"
  }
}
```

---

#### Update Topic

**Endpoint**: `PUT /api/admin/topics/[topicId]`

**Authentication**: Required (tutor or admin)

**Request Body**:

```json
{
  "name": "Advanced Calculus",
  "description": "Updated description",
  "difficulty_level": "advanced"
}
```

---

#### Delete Topic

**Endpoint**: `DELETE /api/admin/topics/[topicId]`

**Authentication**: Required (tutor or admin)

⚠️ **Warning**: Cannot delete topics that have questions.

---

#### Reorder Topics

**Endpoint**: `POST /api/admin/topics/reorder`

**Authentication**: Required (tutor or admin)

**Request Body**:

```json
{
  "topicIds": [
    "topic-id-1",
    "topic-id-2",
    "topic-id-3"
  ]
}
```

**Response**:

```json
{
  "message": "Topics reordered successfully",
  "updatedCount": 3
}
```

---

## Question Bank APIs

### List Questions

**Endpoint**: `GET /api/admin/questions`

**Authentication**: Required (tutor or admin)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page |
| subjectId | string | No | - | Filter by subject |
| topicId | string | No | - | Filter by topic |
| difficulty | string | No | - | Filter by difficulty |
| status | string | No | active | Filter by status |
| search | string | No | - | Search in question text |

**Response**:

```json
{
  "questions": [
    {
      "id": "question-id-123",
      "subject_id": "subject-id",
      "topic_id": "topic-id",
      "question_text": "What is 2 + 2?",
      "question_type": "multiple_choice",
      "options": {
        "A": "3",
        "B": "4",
        "C": "5",
        "D": "6"
      },
      "correct_answer": "B",
      "explanation": "2 plus 2 equals 4",
      "difficulty_level": "beginner",
      "tags": ["arithmetic", "addition"],
      "status": "active",
      "created_by": "user-id",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 450,
    "totalPages": 23
  }
}
```

---

### Get Question Details

**Endpoint**: `GET /api/admin/questions/[questionId]`

**Authentication**: Required (tutor or admin)

**Response**:

```json
{
  "question": {
    "id": "question-id-123",
    "subject_id": "subject-id",
    "topic_id": "topic-id",
    "question_text": "What is 2 + 2?",
    "question_image_url": null,
    "question_type": "multiple_choice",
    "options": {
      "A": "3",
      "B": "4",
      "C": "5",
      "D": "6"
    },
    "correct_answer": "B",
    "explanation": "2 plus 2 equals 4",
    "difficulty_level": "beginner",
    "tags": ["arithmetic", "addition"],
    "status": "active",
    "created_by": "user-id",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "subject": {
    "id": "subject-id",
    "name": "Mathematics"
  },
  "topic": {
    "id": "topic-id",
    "name": "Arithmetic"
  }
}
```

---

### Create Question

**Endpoint**: `POST /api/admin/questions`

**Authentication**: Required (tutor or admin)

**Request Body**:

```json
{
  "subject_id": "subject-id-123",
  "topic_id": "topic-id-456",
  "question_text": "What is the capital of Nigeria?",
  "question_image_url": null,
  "question_type": "multiple_choice",
  "options": {
    "A": "Lagos",
    "B": "Abuja",
    "C": "Kano",
    "D": "Port Harcourt"
  },
  "correct_answer": "B",
  "explanation": "Abuja has been the capital since 1991",
  "difficulty_level": "beginner",
  "tags": ["geography", "capitals"],
  "status": "active"
}
```

**Required Fields**:
- `subject_id`, `topic_id`
- `question_text`
- `question_type` (currently only `multiple_choice`)
- `options` (object with A, B, C, D keys)
- `correct_answer` (A, B, C, or D)
- `explanation`
- `difficulty_level` (beginner/intermediate/advanced)

**Response**:

```json
{
  "question": {
    "id": "new-question-id",
    "question_text": "What is the capital of Nigeria?",
    "created_at": "2024-12-16T10:00:00Z"
  }
}
```

---

### Update Question

**Endpoint**: `PUT /api/admin/questions/[questionId]`

**Authentication**: Required (tutor or admin)

**Request Body**: Same as Create Question

**Response**:

```json
{
  "question": {
    "id": "question-id",
    "question_text": "Updated question text",
    "updated_at": "2024-12-16T10:05:00Z"
  }
}
```

---

### Delete Question

**Endpoint**: `DELETE /api/admin/questions/[questionId]`

**Authentication**: Required (tutor or admin)

**Response**:

```json
{
  "message": "Question deleted successfully",
  "deletedQuestionId": "question-id"
}
```

---

### Bulk Delete Questions

**Endpoint**: `DELETE /api/admin/questions/bulk`

**Authentication**: Required (tutor or admin)

**Request Body**:

```json
{
  "questionIds": [
    "question-id-1",
    "question-id-2",
    "question-id-3"
  ]
}
```

**Response**:

```json
{
  "message": "Questions deleted successfully",
  "deletedCount": 3
}
```

---

### Preview Question

**Endpoint**: `POST /api/admin/questions/preview`

**Authentication**: Required (tutor or admin)

**Request Body**: Same as Create Question (but doesn't save to database)

**Response**:

```json
{
  "preview": {
    "question_text": "What is 2 + 2?",
    "options": {
      "A": "3",
      "B": "4",
      "C": "5",
      "D": "6"
    },
    "correct_answer": "B",
    "explanation": "2 plus 2 equals 4"
  }
}
```

**Use Case**: Preview how a question will look before saving.

---

## CSV Import APIs

### Download CSV Template

**Endpoint**: `GET /api/admin/import/template`

**Authentication**: Required (tutor or admin)

**Response**: CSV file download

**Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="question_import_template.csv"
```

**Example Request**:

```javascript
const response = await fetch('/api/admin/import/template', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'template.csv';
a.click();
```

---

### Validate CSV File

**Endpoint**: `POST /api/admin/import/validate`

**Authentication**: Required (tutor or admin)

**Request**: Multipart form data with CSV file

**Form Fields**:
- `file`: CSV file (required)

**Response (Success)**:

```json
{
  "valid": true,
  "questionCount": 50,
  "message": "Validation successful"
}
```

**Response (Failure)**:

```json
{
  "valid": false,
  "errors": [
    {
      "row": 1,
      "field": "subject_id",
      "message": "Invalid subject_id - ID does not exist"
    },
    {
      "row": 3,
      "field": "correct_answer",
      "message": "Must be A, B, C, or D"
    }
  ],
  "errorCount": 2
}
```

**Example Request**:

```javascript
const formData = new FormData();
formData.append('file', csvFile);

const response = await fetch('/api/admin/import/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
if (result.valid) {
  console.log(`${result.questionCount} questions validated`);
} else {
  console.log(`${result.errorCount} errors found`);
}
```

---

### Process CSV Import

**Endpoint**: `POST /api/admin/import/process`

**Authentication**: Required (tutor or admin)

**Request**: Multipart form data with CSV file (must be validated first)

**Response**:

```json
{
  "reportId": "import-report-id-123",
  "success": true,
  "processedCount": 50,
  "successCount": 48,
  "failureCount": 2,
  "errors": [
    {
      "row": 15,
      "error": "Duplicate question text"
    }
  ]
}
```

**Example Request**:

```javascript
const formData = new FormData();
formData.append('file', csvFile);

const response = await fetch('/api/admin/import/process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const report = await response.json();
console.log(`Imported ${report.successCount} of ${report.processedCount} questions`);
```

---

### List Import Reports

**Endpoint**: `GET /api/admin/import/reports`

**Authentication**: Required (tutor or admin)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page |

**Response**:

```json
{
  "reports": [
    {
      "id": "report-id-123",
      "user_id": "user-id",
      "file_name": "questions.csv",
      "total_questions": 50,
      "success_count": 48,
      "failure_count": 2,
      "status": "completed",
      "created_at": "2024-12-16T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### Get Import Report Details

**Endpoint**: `GET /api/admin/import/reports/[reportId]`

**Authentication**: Required (tutor or admin)

**Response**:

```json
{
  "report": {
    "id": "report-id-123",
    "user_id": "user-id",
    "file_name": "questions.csv",
    "total_questions": 50,
    "success_count": 48,
    "failure_count": 2,
    "errors": [
      {
        "row": 15,
        "error": "Duplicate question text"
      },
      {
        "row": 32,
        "error": "Invalid topic_id"
      }
    ],
    "status": "completed",
    "created_at": "2024-12-16T10:00:00Z"
  },
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "full_name": "Admin User"
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource (e.g., email exists) |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Server-side error |

### Error Response Format

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific_field",
    "reason": "Detailed reason"
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_REQUIRED` | Authentication token missing | Include Authorization header |
| `INVALID_TOKEN` | Token expired or invalid | Refresh token and retry |
| `INSUFFICIENT_PERMISSIONS` | User lacks required role | Check user role is admin/tutor |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist | Verify ID is correct |
| `VALIDATION_ERROR` | Data validation failed | Check request body format |
| `DUPLICATE_ENTRY` | Resource already exists | Use unique values |
| `CONSTRAINT_VIOLATION` | Database constraint violated | Check foreign key relationships |

---

## Rate Limiting

### Current Status

⚠️ **Note**: Rate limiting is not currently implemented but is recommended for production.

### Recommended Limits (Future)

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Read (GET) | 100 requests | 1 minute |
| Write (POST/PUT/DELETE) | 30 requests | 1 minute |
| CSV Import | 5 requests | 5 minutes |

### Rate Limit Headers (Future)

When implemented, responses will include:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Best Practices

### 1. Error Handling

Always handle errors properly:

```javascript
try {
  const response = await fetch('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    // Handle specific error codes
    if (response.status === 401) {
      // Redirect to login
    } else if (response.status === 403) {
      // Show permission denied message
    }
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('Network error:', error);
  // Handle network errors
}
```

### 2. Pagination

Always use pagination for list endpoints:

```javascript
async function fetchAllUsers() {
  let page = 1;
  let allUsers = [];
  
  while (true) {
    const response = await fetch(`/api/admin/users?page=${page}&limit=100`);
    const { users, pagination } = await response.json();
    
    allUsers = allUsers.concat(users);
    
    if (page >= pagination.totalPages) break;
    page++;
  }
  
  return allUsers;
}
```

### 3. Caching

Cache frequently accessed data:

```javascript
const cache = new Map();

async function getSubjects() {
  if (cache.has('subjects')) {
    return cache.get('subjects');
  }
  
  const response = await fetch('/api/admin/subjects');
  const subjects = await response.json();
  
  cache.set('subjects', subjects);
  setTimeout(() => cache.delete('subjects'), 5 * 60 * 1000); // 5 min cache
  
  return subjects;
}
```

### 4. Batch Operations

Use bulk endpoints when possible:

```javascript
// Instead of deleting one by one
for (const id of questionIds) {
  await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
}

// Use bulk delete
await fetch('/api/admin/questions/bulk', {
  method: 'DELETE',
  body: JSON.stringify({ questionIds })
});
```

---

## Developer Tools

### Testing with cURL

```bash
# Get dashboard stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/admin/dashboard

# Create a subject
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Physics","description":"Physical sciences"}' \
  https://your-app.com/api/admin/subjects

# Upload CSV
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@questions.csv" \
  https://your-app.com/api/admin/import/validate
```

### Postman Collection

(Future feature: Download Postman collection for easy API testing)

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Dashboard statistics and alerts
- Complete user management
- Content management (subjects, topics)
- Question bank CRUD operations
- CSV import with validation
- Import reporting

---

*Last Updated: December 2024*
*For SabiPrep Admin Portal Version 1.0.0*
