# Restaurant Krong Thai SOP Management API Documentation

## Overview

The Restaurant Krong Thai SOP Management API provides comprehensive endpoints for managing Standard Operating Procedures (SOPs), tracking completion progress, and generating analytics. The API follows RESTful principles and includes robust authentication, validation, and error handling.

## Base URL
```
https://your-domain.com/api
```

## Authentication

All API endpoints require authentication using PIN-based sessions. Include the session token in the Authorization header:

```
Authorization: Bearer {session_token}
```

Or as a cookie:
```
Cookie: auth-session={session_token}
```

## Response Format

All responses follow a consistent JSON structure:

```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  timestamp?: string;
}
```

## Pagination

List endpoints support pagination with the following parameters:

```typescript
interface PaginationParams {
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 20, max: 100)
  sortBy?: string;      // Field to sort by
  sortOrder?: 'asc' | 'desc'; // Sort direction (default: 'desc')
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | Missing or invalid authentication |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DATABASE_ERROR` | Database operation failed |
| `INTERNAL_ERROR` | Unexpected server error |

---

# SOP Documents API

## List SOP Documents

**GET** `/api/sop/documents`

Retrieve a paginated list of SOP documents with filtering options.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `sortBy` | string | Sort field (default: 'updated_at') |
| `sortOrder` | string | 'asc' or 'desc' (default: 'desc') |
| `category_id` | string | Filter by category UUID |
| `status` | string | Filter by status ('draft', 'review', 'approved', 'archived') |
| `difficulty_level` | string | Filter by difficulty ('beginner', 'intermediate', 'advanced') |
| `created_by` | string | Filter by creator UUID |
| `updated_after` | string | Filter by update date (ISO 8601) |
| `review_due` | boolean | Filter SOPs due for review |
| `tags` | string | Comma-separated list of tags |

### Response

```typescript
interface SOPDocumentResponse {
  id: string;
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  category_id: string;
  version: string;
  status: string;
  tags: string[];
  difficulty_level: string;
  estimated_read_time: number;
  // ... plus category and user details
}
```

### Example

```bash
curl -X GET "https://api.example.com/api/sop/documents?page=1&limit=10&category_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer {token}"
```

## Create SOP Document

**POST** `/api/sop/documents`

Create a new SOP document.

### Request Body

```typescript
interface CreateSOPDocumentRequest {
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  category_id: string;
  tags: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_read_time: number;
  review_due_date?: string;
}
```

### Example

```bash
curl -X POST "https://api.example.com/api/sop/documents" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kitchen Safety Procedures",
    "title_fr": "Procédures de sécurité en cuisine",
    "content": "Detailed safety procedures...",
    "content_fr": "Procédures de sécurité détaillées...",
    "category_id": "123e4567-e89b-12d3-a456-426614174000",
    "tags": ["safety", "kitchen", "procedures"],
    "difficulty_level": "intermediate",
    "estimated_read_time": 15
  }'
```

## Get SOP Document

**GET** `/api/sop/documents/{id}`

Retrieve a specific SOP document by ID.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | SOP document UUID |

## Update SOP Document

**PUT** `/api/sop/documents/{id}`

Update an existing SOP document.

### Request Body

```typescript
interface UpdateSOPDocumentRequest {
  title?: string;
  title_fr?: string;
  content?: string;
  content_fr?: string;
  category_id?: string;
  tags?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_read_time?: number;
  status?: 'draft' | 'review' | 'approved' | 'archived';
}
```

## Delete SOP Document

**DELETE** `/api/sop/documents/{id}`

Soft delete an SOP document (sets `is_active` to false).

---

# SOP Categories API

## List SOP Categories

**GET** `/api/sop/categories`

Retrieve a list of SOP categories with statistics.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `includeStats` | boolean | Include document counts (default: true) |
| `activeOnly` | boolean | Only active categories (default: true) |

### Response

```typescript
interface SOPCategoryWithStats {
  id: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  document_count: number;
  completed_count: number;
  pending_reviews: number;
}
```

## Create SOP Category

**POST** `/api/sop/categories`

Create a new SOP category.

### Request Body

```typescript
interface CreateSOPCategoryRequest {
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  icon?: string;
  color?: string;
  sort_order: number;
}
```

## Get SOP Category

**GET** `/api/sop/categories/{id}`

Retrieve a specific category with statistics.

## Update SOP Category

**PUT** `/api/sop/categories/{id}`

Update an existing category.

## Delete SOP Category

**DELETE** `/api/sop/categories/{id}`

Delete a category (only if no active SOPs exist in it).

---

# SOP Search API

## Search SOPs

**GET** `/api/sop/search`

Search SOP documents using full-text search.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` or `query` | string | Search query (required) |
| `locale` | string | Search locale ('en' or 'fr', default: 'en') |
| `search_fields` | string | Comma-separated fields ('title', 'content', 'tags') |
| `fuzzy` | boolean | Enable fuzzy search (default: false) |
| `category_id` | string | Filter by category |
| `status` | string | Filter by status |
| `difficulty_level` | string | Filter by difficulty |
| `tags` | string | Filter by tags |

### Response

```typescript
interface SOPSearchResponse {
  success: boolean;
  data: SOPSearchResult[];
  query: string;
  total_results: number;
  search_time_ms: number;
  suggestions?: string[];
}

interface SOPSearchResult {
  document: SOPDocumentResponse;
  relevance_score: number;
  highlighted_text?: string;
  match_type: 'title' | 'content' | 'tags';
}
```

### Example

```bash
curl -X GET "https://api.example.com/api/sop/search?q=kitchen%20safety&locale=en&fuzzy=true" \
  -H "Authorization: Bearer {token}"
```

## Advanced Search

**POST** `/api/sop/search`

Perform advanced search with complex query structures.

### Request Body

```typescript
interface SOPSearchFilters {
  query?: string;
  locale?: 'en' | 'fr';
  search_fields?: ('title' | 'content' | 'tags')[];
  fuzzy?: boolean;
  category_id?: string;
  status?: string;
  difficulty_level?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}
```

---

# SOP Completions API

## List Completions

**GET** `/api/sop/completions`

Retrieve completion records with filtering.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Filter by user UUID |
| `sop_id` | string | Filter by SOP UUID |
| `completed_only` | boolean | Only completed SOPs |
| `date_from` | string | Start date filter (ISO 8601) |
| `date_to` | string | End date filter (ISO 8601) |
| `include_stats` | boolean | Include completion statistics |

### Response

```typescript
interface SOPCompletion {
  id: string;
  user_id: string;
  sop_id: string;
  progress_percentage: number;
  time_spent_minutes: number;
  completed_at?: string;
  verification_photos?: string[];
  notes?: string;
}
```

## Create/Update Completion

**POST** `/api/sop/completions`

Record or update SOP completion progress.

### Request Body

```typescript
interface CreateSOPCompletionRequest {
  sop_id: string;
  completion_percentage: number;
  time_spent_minutes: number;
  verification_photos?: string[];
  notes?: string;
}
```

### Example

```bash
curl -X POST "https://api.example.com/api/sop/completions" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "sop_id": "123e4567-e89b-12d3-a456-426614174000",
    "completion_percentage": 100,
    "time_spent_minutes": 25,
    "notes": "Completed all safety checks successfully"
  }'
```

---

# SOP Analytics API

## Get Analytics

**GET** `/api/sop/analytics`

Retrieve comprehensive SOP analytics data.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | string | Start date (ISO 8601) |
| `end_date` | string | End date (ISO 8601) |
| `category_id` | string | Filter by category |
| `user_id` | string | Filter by user |
| `department` | string | Filter by user role |

### Response

```typescript
interface SOPAnalyticsResponse {
  overview: {
    total_sops: number;
    total_completions: number;
    average_completion_rate: number;
    average_time_per_sop: number;
  };
  completion_trends: {
    date: string;
    completions: number;
    unique_users: number;
  }[];
  category_performance: {
    category: SOPCategory;
    completion_rate: number;
    average_time: number;
    total_completions: number;
  }[];
  user_performance: {
    user_id: string;
    full_name: string;
    completions: number;
    average_time: number;
    completion_rate: number;
  }[];
  most_accessed_sops: SOPDocumentResponse[];
  least_accessed_sops: SOPDocumentResponse[];
}
```

### Example

```bash
curl -X GET "https://api.example.com/api/sop/analytics?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer {token}"
```

---

# QR Code Generation API

## Generate QR Code

**POST** `/api/qr/generate`

Generate QR codes for SOP documents.

### Request Body

```typescript
interface QRCodeGenerateRequest {
  sop_id: string;
  size?: number;                    // 100-1000px (default: 300)
  format?: 'png' | 'svg' | 'pdf';  // default: 'svg'
  include_title?: boolean;          // default: true
  custom_data?: Record<string, any>;
}
```

### Response

```typescript
interface QRCodeResponse {
  success: boolean;
  data: {
    qr_code_url: string;
    sop_id: string;
    access_url: string;
    expires_at?: string;
  };
}
```

### Example

```bash
curl -X POST "https://api.example.com/api/qr/generate" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "sop_id": "123e4567-e89b-12d3-a456-426614174000",
    "size": 400,
    "format": "svg",
    "include_title": true
  }'
```

---

# Photo Upload API

## Upload SOP Photos

**POST** `/api/uploads/sop-photos`

Upload verification photos for SOP completion.

### Request

Multipart form data with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `files` | File[] | Image files (max 10, 10MB each) |
| `sop_id` | string | SOP document UUID (required) |
| `completion_id` | string | Completion record UUID (optional) |
| `caption` | string | Photo caption (optional) |
| `verification_type` | string | 'before', 'during', 'after', 'evidence' |

### Supported File Types

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`

### Response

```typescript
interface SOPPhotoUploadResponse {
  success: boolean;
  data: {
    uploaded_files: {
      id: string;
      filename: string;
      file_path: string;
      file_size: number;
      content_type: string;
      verification_type?: string;
    }[];
  };
}
```

### Example

```bash
curl -X POST "https://api.example.com/api/uploads/sop-photos" \
  -H "Authorization: Bearer {token}" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "sop_id=123e4567-e89b-12d3-a456-426614174000" \
  -F "verification_type=after" \
  -F "caption=Safety procedures completed successfully"
```

---

# Rate Limiting

All endpoints implement rate limiting to ensure system stability:

| Endpoint Category | Requests per Minute |
|-------------------|---------------------|
| Document CRUD | 100 |
| Search | 500 |
| Analytics | 100 |
| File Upload | 20 |
| QR Generation | 50 |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

# Permissions

All endpoints require specific permissions based on user roles:

## Role Hierarchy

1. **Admin** - Full access to all endpoints
2. **Manager** - Read/write access, user management
3. **Chef** - Read/write SOPs, own analytics
4. **Server** - Read SOPs, own progress
5. **Staff** - Read SOPs, own progress

## Permission Matrix

| Action | Admin | Manager | Chef | Server | Staff |
|--------|-------|---------|------|--------|-------|
| Read SOPs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create SOPs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update SOPs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete SOPs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Categories | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Analytics | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Own Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload Photos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generate QR Codes | ✅ | ✅ | ✅ | ✅ | ✅ |

---

# Best Practices

## Error Handling

Always check the `success` field in responses:

```typescript
const response = await fetch('/api/sop/documents');
const data = await response.json();

if (!data.success) {
  console.error(`API Error [${data.errorCode}]: ${data.error}`);
  // Handle error based on errorCode
  return;
}

// Process successful response
console.log(data.data);
```

## Pagination

For large datasets, always use pagination:

```typescript
const getAllSOPs = async () => {
  const allSOPs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`/api/sop/documents?page=${page}&limit=50`);
    const data = await response.json();
    
    if (data.success) {
      allSOPs.push(...data.data);
      hasMore = data.pagination.hasNext;
      page++;
    } else {
      break;
    }
  }

  return allSOPs;
};
```

## File Uploads

For file uploads, use FormData:

```typescript
const uploadPhotos = async (files: FileList, sopId: string) => {
  const formData = new FormData();
  
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });
  
  formData.append('sop_id', sopId);
  formData.append('verification_type', 'after');
  
  const response = await fetch('/api/uploads/sop-photos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: formData,
  });
  
  return response.json();
};
```

## Search Optimization

For better search performance:

1. Use specific search fields when possible
2. Implement debouncing for search-as-you-type
3. Cache frequent search results
4. Use pagination for large result sets

```typescript
const searchSOPs = debounce(async (query: string) => {
  const response = await fetch(`/api/sop/search?q=${encodeURIComponent(query)}&search_fields=title,tags&limit=10`);
  return response.json();
}, 300);
```

---

# SDK Examples

## JavaScript/TypeScript

```typescript
class SOPApiClient {
  constructor(private baseUrl: string, private token: string) {}

  async getDocuments(filters?: any) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/api/sop/documents?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async createDocument(data: CreateSOPDocumentRequest) {
    const response = await fetch(`${this.baseUrl}/api/sop/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async searchSOPs(query: string, filters?: any) {
    const params = new URLSearchParams({ q: query, ...filters });
    const response = await fetch(`${this.baseUrl}/api/sop/search?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}
```

## Python

```python
import requests
from typing import Dict, Any

class SOPApiClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def get_documents(self, filters: Dict[str, Any] = None) -> Dict:
        response = requests.get(
            f'{self.base_url}/api/sop/documents',
            headers=self.headers,
            params=filters or {}
        )
        return response.json()
    
    def create_document(self, data: Dict[str, Any]) -> Dict:
        response = requests.post(
            f'{self.base_url}/api/sop/documents',
            headers={**self.headers, 'Content-Type': 'application/json'},
            json=data
        )
        return response.json()
    
    def search_sops(self, query: str, **filters) -> Dict:
        params = {'q': query, **filters}
        response = requests.get(
            f'{self.base_url}/api/sop/search',
            headers=self.headers,
            params=params
        )
        return response.json()
```

---

This API documentation provides comprehensive coverage of all implemented SOP management endpoints. For questions or support, please contact the development team.