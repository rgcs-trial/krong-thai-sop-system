# Translation API Reference
# เอกสารอ้างอิง API การแปล

*Restaurant Krong Thai SOP Management System*  
*ระบบจัดการ SOP ร้านอาหารไทยกรองไทย*

**Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**API Version**: v1  
**Base URL**: `https://your-domain.com/api`

---

## Table of Contents / สารบัญ

1. [Authentication](#authentication)
2. [Public Translation APIs](#public-translation-apis)
3. [Administrative APIs](#administrative-apis)
4. [WebSocket APIs](#websocket-apis)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)
7. [SDK Examples](#sdk-examples)
8. [OpenAPI Specification](#openapi-specification)

---

## Authentication

The Translation API uses a hybrid authentication system supporting both session-based and token-based authentication suitable for restaurant tablet environments.

### Authentication Methods

#### 1. Session-Based Authentication (Recommended for Web Apps)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@krongthai.com",
  "pin": "1234",
  "restaurantId": "restaurant-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "admin@krongthai.com",
      "role": "admin",
      "permissions": ["read", "write", "approve", "publish"]
    },
    "session": {
      "expiresAt": "2025-07-27T18:00:00Z",
      "restaurantId": "restaurant-uuid"
    }
  }
}
```

#### 2. API Token Authentication (For Programmatic Access)
```http
Authorization: Bearer your-api-token
```

#### 3. PIN-Based Authentication (For Quick Tablet Access)
```http
POST /api/auth/staff-pin-login
Content-Type: application/json

{
  "pin": "1234",
  "restaurantId": "restaurant-uuid"
}
```

### Permission Levels

| Role | Read | Create | Update | Approve | Publish | Admin |
|------|------|--------|--------|---------|---------|-------|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Translator** | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| **Reviewer** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*\* Only own translations in draft status*

---

## Public Translation APIs

### GET /api/translations/[locale]

Retrieve all published translations for a specific locale with intelligent caching.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locale` | string | Yes | Language code (`en`, `th`, `fr`) |
| `keys` | string[] | No | Specific translation keys to retrieve |
| `category` | string | No | Filter by category |
| `includeContext` | boolean | No | Include metadata and context |
| `version` | string | No | Specific version to retrieve |

#### Request Examples

```bash
# Get all English translations
GET /api/translations/en

# Get specific keys
GET /api/translations/en?keys=common.welcome,menu.title

# Get menu category only
GET /api/translations/th?category=menu

# Include context and metadata
GET /api/translations/en?includeContext=true
```

#### Response Format

```typescript
interface GetTranslationsResponse {
  locale: Locale;
  translations: Record<string, string>;
  metadata: {
    version: string;
    lastUpdated: string;
    cachedAt: string;
    locale: Locale;
    totalKeys: number;
  };
}
```

#### Example Response

```json
{
  "locale": "en",
  "translations": {
    "common.welcome": "Welcome to Krong Thai",
    "common.loading": "Loading...",
    "menu.appetizers.title": "Appetizers",
    "menu.appetizers.spring_rolls": "Fresh Spring Rolls"
  },
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2025-07-27T10:30:00Z",
    "cachedAt": "2025-07-27T10:30:05Z",
    "locale": "en",
    "totalKeys": 4
  }
}
```

#### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=300
ETag: "abc123def456"
X-Request-ID: req_1234567890
X-Response-Time: 45ms
X-Cache-Status: HIT
```

---

### GET /api/translations/[locale]/key/[...keyPath]

Retrieve a specific translation key with full context information.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locale` | string | Yes | Language code |
| `keyPath` | string | Yes | Dot-separated key path |
| `includeVariables` | boolean | No | Include variable definitions |
| `includeHistory` | boolean | No | Include change history |

#### Request Examples

```bash
# Get specific translation key
GET /api/translations/en/key/common/welcome

# Get menu item with variables
GET /api/translations/th/key/menu/items/pad_thai?includeVariables=true

# Get with full context and history
GET /api/translations/en/key/common/welcome?includeVariables=true&includeHistory=true
```

#### Response Format

```typescript
interface TranslationKeyResponse {
  key: string;
  value: string;
  locale: Locale;
  context: {
    description?: string;
    variables?: string[];
    category: string;
    lastUpdated: string;
    version: number;
  };
  icuMessage?: string;
  history?: TranslationHistoryEntry[];
}
```

#### Example Response

```json
{
  "key": "menu.items.pad_thai",
  "value": "Authentic Pad Thai with {protein}",
  "locale": "en",
  "context": {
    "description": "Popular Thai stir-fried noodle dish",
    "variables": ["protein"],
    "category": "menu",
    "lastUpdated": "2025-07-27T09:15:00Z",
    "version": 3
  },
  "icuMessage": "Authentic Pad Thai with {protein, select, chicken {chicken} shrimp {shrimp} tofu {tofu} other {your choice of protein}}",
  "history": [
    {
      "action": "UPDATE",
      "previousValue": "Traditional Pad Thai with {protein}",
      "newValue": "Authentic Pad Thai with {protein}",
      "changedBy": "translator@krongthai.com",
      "changedAt": "2025-07-27T09:15:00Z",
      "reason": "Enhanced description for authenticity"
    }
  ]
}
```

---

### GET /api/translations/usage

Get translation usage analytics and statistics.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dateFrom` | string | No | Start date (ISO 8601) |
| `dateTo` | string | No | End date (ISO 8601) |
| `locale` | string | No | Filter by locale |
| `category` | string | No | Filter by category |
| `limit` | number | No | Limit results (default: 100) |

#### Request Example

```bash
GET /api/translations/usage?dateFrom=2025-07-20&dateTo=2025-07-27&locale=en&limit=50
```

#### Response Format

```typescript
interface TranslationUsageResponse {
  analytics: {
    totalRequests: number;
    uniqueKeys: number;
    averageResponseTime: number;
    cacheHitRate: number;
  };
  mostUsedKeys: Array<{
    key: string;
    requestCount: number;
    locale: string;
    category: string;
  }>;
  performanceMetrics: {
    p50ResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}
```

---

## Administrative APIs

### POST /api/admin/translations

Create a new translation entry.

#### Authentication Required
- Role: `translator` or higher
- Permissions: `create`

#### Request Body

```typescript
interface CreateTranslationRequest {
  keyId: string;
  locale: Locale;
  value: string;
  icuMessage?: string;
  translatorNotes?: string;
  variables?: string[];
  submitForReview?: boolean;
}
```

#### Request Example

```http
POST /api/admin/translations
Authorization: Bearer your-token
Content-Type: application/json

{
  "keyId": "translation-key-uuid",
  "locale": "th",
  "value": "ยินดีต้อนรับสู่กรองไทย",
  "translatorNotes": "Formal greeting for restaurant welcome",
  "submitForReview": true
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "translation-uuid",
    "keyId": "translation-key-uuid",
    "locale": "th",
    "value": "ยินดีต้อนรับสู่กรองไทย",
    "status": "review",
    "version": 1,
    "createdAt": "2025-07-27T10:30:00Z",
    "createdBy": "translator@krongthai.com"
  },
  "requestId": "req_1234567890",
  "timestamp": "2025-07-27T10:30:00Z"
}
```

---

### PUT /api/admin/translations/[id]

Update an existing translation.

#### Authentication Required
- Role: `translator` (own translations only) or `reviewer` or higher
- Permissions: `update`

#### Request Body

```typescript
interface UpdateTranslationRequest {
  value?: string;
  icuMessage?: string;
  status?: TranslationStatus;
  translatorNotes?: string;
  reviewerNotes?: string;
  changeReason: string;
}
```

#### Request Example

```http
PUT /api/admin/translations/translation-uuid
Authorization: Bearer your-token
Content-Type: application/json

{
  "value": "ยินดีต้อนรับสู่ร้านอาหารกรองไทย",
  "changeReason": "Added restaurant context for clarity",
  "translatorNotes": "Enhanced greeting to include restaurant context"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "translation-uuid",
    "value": "ยินดีต้อนรับสู่ร้านอาหารกรองไทย",
    "version": 2,
    "status": "draft",
    "updatedAt": "2025-07-27T11:00:00Z",
    "updatedBy": "translator@krongthai.com",
    "changeHistory": {
      "action": "UPDATE",
      "previousValue": "ยินดีต้อนรับสู่กรองไทย",
      "newValue": "ยินดีต้อนรับสู่ร้านอาหารกรองไทย",
      "reason": "Added restaurant context for clarity"
    }
  },
  "requestId": "req_1234567891",
  "timestamp": "2025-07-27T11:00:00Z"
}
```

---

### PUT /api/admin/translations/[id]/status

Update translation workflow status (approve, publish, etc.).

#### Authentication Required
- Role: `reviewer` (for approve), `manager` (for publish)
- Permissions: `approve` or `publish`

#### Request Body

```typescript
interface UpdateStatusRequest {
  status: 'review' | 'approved' | 'published' | 'deprecated';
  notes?: string;
  publishSchedule?: string; // ISO 8601 datetime for scheduled publishing
}
```

#### Request Example

```http
PUT /api/admin/translations/translation-uuid/status
Authorization: Bearer your-token
Content-Type: application/json

{
  "status": "approved",
  "notes": "Translation reviewed and approved for publication"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "translation-uuid",
    "status": "approved",
    "approvedAt": "2025-07-27T11:30:00Z",
    "approvedBy": "reviewer@krongthai.com",
    "reviewerNotes": "Translation reviewed and approved for publication",
    "workflow": {
      "previousStatus": "review",
      "newStatus": "approved",
      "canPublish": true,
      "nextSteps": ["publish"]
    }
  },
  "requestId": "req_1234567892",
  "timestamp": "2025-07-27T11:30:00Z"
}
```

---

### POST /api/admin/translations/bulk

Perform bulk operations on translations (import, export, batch updates).

#### Authentication Required
- Role: `reviewer` or higher
- Permissions: `create`, `update`

#### Import Request

```http
POST /api/admin/translations/bulk
Authorization: Bearer your-token
Content-Type: application/json

{
  "operation": "import",
  "format": "csv",
  "data": [
    {
      "key": "menu.new.item",
      "category": "menu",
      "description": "New menu item",
      "en": "Delicious Thai Curry",
      "th": "แกงไทยอร่อย"
    }
  ],
  "options": {
    "skipExisting": false,
    "updateExisting": true,
    "createDrafts": true,
    "validateFormat": true
  }
}
```

#### Export Request

```http
POST /api/admin/translations/bulk
Authorization: Bearer your-token
Content-Type: application/json

{
  "operation": "export",
  "format": "csv",
  "filters": {
    "locales": ["en", "th"],
    "categories": ["menu", "common"],
    "status": ["published"]
  },
  "options": {
    "includeMetadata": true,
    "includeHistory": false
  }
}
```

#### Bulk Import Response

```json
{
  "success": true,
  "data": {
    "operationId": "bulk-op-uuid",
    "status": "processing",
    "summary": {
      "totalItems": 25,
      "processed": 0,
      "created": 0,
      "updated": 0,
      "errors": 0
    },
    "estimatedDuration": "2-3 minutes"
  },
  "requestId": "req_1234567893",
  "timestamp": "2025-07-27T12:00:00Z"
}
```

#### Bulk Export Response

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://your-domain.com/downloads/translations-export-uuid.csv",
    "expiresAt": "2025-07-27T18:00:00Z",
    "fileSize": 1048576,
    "recordCount": 150,
    "format": "csv"
  },
  "requestId": "req_1234567894",
  "timestamp": "2025-07-27T12:00:00Z"
}
```

---

### GET /api/admin/translations/dashboard-stats

Get comprehensive dashboard statistics for translation management.

#### Authentication Required
- Role: `reviewer` or higher
- Permissions: `read`

#### Request Example

```bash
GET /api/admin/translations/dashboard-stats?dateRange=30d
```

#### Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalKeys": 1250,
      "totalTranslations": 3750,
      "completionRate": 95.2,
      "pendingApprovals": 12,
      "missingTranslations": 8
    },
    "qualityMetrics": {
      "averageScore": 4.3,
      "recentReviews": 45,
      "rejectionRate": 2.1
    },
    "statusBreakdown": {
      "draft": 8,
      "review": 12,
      "approved": 25,
      "published": 3705
    },
    "completionByLocale": {
      "en": 100.0,
      "th": 95.2,
      "fr": 89.8
    },
    "activityMetrics": {
      "translationsCreated": 15,
      "translationsUpdated": 32,
      "approvalsCompleted": 28,
      "publicationsCompleted": 30
    },
    "performanceMetrics": {
      "averageResponseTime": 45,
      "cacheHitRate": 96.5,
      "errorRate": 0.2
    }
  },
  "requestId": "req_1234567895",
  "timestamp": "2025-07-27T12:30:00Z"
}
```

---

### POST /api/admin/translation-keys

Create a new translation key.

#### Authentication Required
- Role: `translator` or higher
- Permissions: `create`

#### Request Body

```typescript
interface CreateTranslationKeyRequest {
  keyName: string;
  category: string;
  description: string;
  namespace?: string;
  interpolationVars?: string[];
  supportsPluralRules?: boolean;
  contextNotes?: string;
}
```

#### Request Example

```http
POST /api/admin/translation-keys
Authorization: Bearer your-token
Content-Type: application/json

{
  "keyName": "menu.specials.daily",
  "category": "menu",
  "description": "Daily special menu item description",
  "namespace": "restaurant",
  "interpolationVars": ["dishName", "price", "description"],
  "supportsPluralRules": false,
  "contextNotes": "Used for daily specials board display"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "key-uuid",
    "keyName": "menu.specials.daily",
    "category": "menu",
    "description": "Daily special menu item description",
    "namespace": "restaurant",
    "interpolationVars": ["dishName", "price", "description"],
    "supportsPluralRules": false,
    "isActive": true,
    "createdAt": "2025-07-27T13:00:00Z",
    "createdBy": "translator@krongthai.com"
  },
  "requestId": "req_1234567896",
  "timestamp": "2025-07-27T13:00:00Z"
}
```

---

## WebSocket APIs

### Connection Endpoint

```
wss://your-domain.com/api/realtime/translations
```

### Authentication

WebSocket connections require authentication via query parameters or connection headers:

```javascript
const ws = new WebSocket('wss://your-domain.com/api/realtime/translations?token=your-jwt-token');

// Or via headers during handshake
const ws = new WebSocket('wss://your-domain.com/api/realtime/translations', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});
```

### Subscription Management

#### Subscribe to Translation Updates

```javascript
// Subscribe to specific locales and namespaces
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: {
    locales: ['en', 'th'],
    namespaces: ['common', 'menu'],
    events: ['translation_updated', 'translation_published'],
    includeMetadata: true
  }
}));
```

#### Subscription Response

```json
{
  "type": "subscription_confirmed",
  "subscriptionId": "sub_1234567890",
  "payload": {
    "locales": ["en", "th"],
    "namespaces": ["common", "menu"],
    "events": ["translation_updated", "translation_published"]
  },
  "timestamp": "2025-07-27T14:00:00Z"
}
```

### Real-time Event Types

#### Translation Updated

```json
{
  "type": "translation_updated",
  "subscriptionId": "sub_1234567890",
  "payload": {
    "translationId": "translation-uuid",
    "key": "common.welcome",
    "locale": "th",
    "previousValue": "ยินดีต้อนรับ",
    "newValue": "ยินดีต้อนรับสู่กรองไทย",
    "status": "draft",
    "version": 2,
    "updatedBy": {
      "userId": "user-uuid",
      "email": "translator@krongthai.com",
      "role": "translator"
    },
    "metadata": {
      "changeReason": "Enhanced greeting with restaurant name",
      "variables": [],
      "category": "common"
    }
  },
  "timestamp": "2025-07-27T14:15:00Z"
}
```

#### Translation Published

```json
{
  "type": "translation_published",
  "subscriptionId": "sub_1234567890",
  "payload": {
    "translationId": "translation-uuid",
    "key": "menu.appetizers.spring_rolls",
    "locale": "en",
    "value": "Fresh Spring Rolls with Peanut Sauce",
    "publishedBy": {
      "userId": "user-uuid",
      "email": "manager@krongthai.com", 
      "role": "manager"
    },
    "metadata": {
      "version": 1,
      "category": "menu",
      "effectiveAt": "2025-07-27T14:30:00Z"
    }
  },
  "timestamp": "2025-07-27T14:30:00Z"
}
```

#### User Collaboration Events

```json
{
  "type": "user_editing_started",
  "subscriptionId": "sub_1234567890",
  "payload": {
    "translationId": "translation-uuid",
    "key": "common.welcome",
    "locale": "th",
    "user": {
      "userId": "user-uuid",
      "email": "translator@krongthai.com",
      "displayName": "Thai Translator",
      "avatar": "https://example.com/avatar.jpg"
    },
    "sessionId": "editing-session-uuid"
  },
  "timestamp": "2025-07-27T14:45:00Z"
}
```

### Error Handling

#### WebSocket Error Response

```json
{
  "type": "error",
  "error": {
    "code": "SUBSCRIPTION_FAILED",
    "message": "Failed to subscribe to translation updates",
    "details": {
      "invalidLocales": ["invalid-locale"],
      "invalidNamespaces": []
    }
  },
  "timestamp": "2025-07-27T15:00:00Z"
}
```

---

## Error Codes

### HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate key) |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Application Error Codes

#### Authentication Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_REQUIRED` | Authentication token required | 401 |
| `AUTH_INVALID` | Invalid authentication credentials | 401 |
| `AUTH_EXPIRED` | Authentication token expired | 401 |
| `PERMISSION_DENIED` | Insufficient permissions for operation | 403 |
| `ROLE_REQUIRED` | Higher role required for operation | 403 |

#### Validation Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_LOCALE` | Unsupported locale specified | 400 |
| `INVALID_KEY_FORMAT` | Translation key format invalid | 400 |
| `MISSING_REQUIRED_FIELD` | Required field missing from request | 400 |
| `INVALID_ICU_FORMAT` | ICU message format syntax error | 422 |
| `VARIABLE_MISMATCH` | Variables don't match key definition | 422 |

#### Business Logic Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `TRANSLATION_NOT_FOUND` | Requested translation does not exist | 404 |
| `KEY_ALREADY_EXISTS` | Translation key already exists | 409 |
| `WORKFLOW_VIOLATION` | Invalid workflow state transition | 422 |
| `CONCURRENT_EDIT` | Translation being edited by another user | 409 |
| `PUBLISHED_IMMUTABLE` | Cannot modify published translation | 422 |

#### System Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `DATABASE_ERROR` | Database operation failed | 500 |
| `CACHE_ERROR` | Cache operation failed | 500 |
| `WEBSOCKET_ERROR` | WebSocket connection error | 500 |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable | 503 |
| `INTERNAL_ERROR` | Unexpected internal error | 500 |

### Error Response Format

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    requestId: string;
    supportInfo?: {
      contactEmail: string;
      documentationUrl: string;
    };
  };
}
```

#### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ICU_FORMAT",
    "message": "ICU message format contains syntax errors",
    "details": {
      "invalidSyntax": "Missing closing brace in pluralization rule",
      "position": 45,
      "suggestion": "Add closing } after 'other {# items'"
    },
    "severity": "medium",
    "timestamp": "2025-07-27T15:30:00Z",
    "requestId": "req_1234567897",
    "supportInfo": {
      "contactEmail": "support@krongthai.com",
      "documentationUrl": "https://docs.krongthai.com/translations/icu-format"
    }
  }
}
```

---

## Rate Limiting

### Rate Limit Policies

| API Category | Requests per Hour | Burst Limit | Window |
|--------------|-------------------|-------------|---------|
| **Public Translation APIs** | 10,000 | 100/min | 1 hour |
| **Admin APIs** | 1,000 | 50/min | 1 hour |
| **Bulk Operations** | 50 | 5/min | 1 hour |
| **WebSocket Connections** | 100 | 10/min | 1 hour |

### Rate Limit Headers

All API responses include rate limiting information:

```http
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9847
X-RateLimit-Reset: 1690483200
X-RateLimit-Retry-After: 60
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "details": {
      "limit": 10000,
      "remaining": 0,
      "resetAt": "2025-07-27T16:00:00Z",
      "retryAfter": 60
    },
    "severity": "medium"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { KrongThaiTranslationAPI } from '@krongthai/translation-sdk';

// Initialize SDK
const translationAPI = new KrongThaiTranslationAPI({
  baseUrl: 'https://your-domain.com/api',
  apiToken: 'your-api-token',
  defaultLocale: 'en'
});

// Get translations
const translations = await translationAPI.getTranslations('en', {
  keys: ['common.welcome', 'menu.title'],
  includeContext: true
});

// Create translation
const newTranslation = await translationAPI.createTranslation({
  keyId: 'key-uuid',
  locale: 'th',
  value: 'ยินดีต้อนรับ',
  submitForReview: true
});

// Subscribe to real-time updates
const subscription = translationAPI.subscribe({
  locales: ['en', 'th'],
  events: ['translation_updated', 'translation_published']
}, (event) => {
  console.log('Translation updated:', event);
});

// Cleanup
subscription.unsubscribe();
```

### Python SDK

```python
from krongthai_translation import TranslationClient

# Initialize client
client = TranslationClient(
    base_url='https://your-domain.com/api',
    api_token='your-api-token'
)

# Get translations
translations = client.get_translations('en', keys=['common.welcome'])

# Create translation
new_translation = client.create_translation(
    key_id='key-uuid',
    locale='th',
    value='ยินดีต้อนรับ',
    submit_for_review=True
)

# Bulk import
import_result = client.bulk_import(
    data=[
        {'key': 'menu.item1', 'en': 'Item 1', 'th': 'รายการ 1'},
        {'key': 'menu.item2', 'en': 'Item 2', 'th': 'รายการ 2'}
    ],
    format='json'
)
```

### cURL Examples

#### Get Translations

```bash
curl -X GET "https://your-domain.com/api/translations/en?keys=common.welcome,menu.title" \
  -H "Accept: application/json" \
  -H "User-Agent: RestaurantApp/1.0"
```

#### Create Translation

```bash
curl -X POST "https://your-domain.com/api/admin/translations" \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "keyId": "key-uuid",
    "locale": "th",
    "value": "ยินดีต้อนรับสู่กรองไทย",
    "submitForReview": true
  }'
```

#### Bulk Export

```bash
curl -X POST "https://your-domain.com/api/admin/translations/bulk" \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "export",
    "format": "csv",
    "filters": {
      "locales": ["en", "th"],
      "categories": ["menu"]
    }
  }'
```

---

## OpenAPI Specification

### Complete OpenAPI 3.0 Schema

```yaml
openapi: 3.0.3
info:
  title: Krong Thai Translation API
  description: Comprehensive translation management API for restaurant operations
  version: 2.0.0
  contact:
    name: API Support
    email: api-support@krongthai.com
    url: https://docs.krongthai.com
  license:
    name: Proprietary
    url: https://krongthai.com/license

servers:
  - url: https://api.krongthai.com/v1
    description: Production server
  - url: https://staging-api.krongthai.com/v1
    description: Staging server

paths:
  /translations/{locale}:
    get:
      summary: Get translations for locale
      description: Retrieve all published translations for a specific locale
      tags:
        - Public APIs
      parameters:
        - name: locale
          in: path
          required: true
          schema:
            type: string
            enum: [en, th, fr]
          description: Language code
        - name: keys
          in: query
          schema:
            type: array
            items:
              type: string
          description: Specific translation keys to retrieve
        - name: category
          in: query
          schema:
            type: string
          description: Filter by category
        - name: includeContext
          in: query
          schema:
            type: boolean
            default: false
          description: Include metadata and context
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetTranslationsResponse'
        '400':
          description: Bad request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Locale not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /admin/translations:
    post:
      summary: Create new translation
      description: Create a new translation entry
      tags:
        - Admin APIs
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTranslationRequest'
      responses:
        '201':
          description: Translation created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TranslationResponse'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
        '403':
          description: Insufficient permissions

components:
  schemas:
    GetTranslationsResponse:
      type: object
      properties:
        locale:
          type: string
          enum: [en, th, fr]
        translations:
          type: object
          additionalProperties:
            type: string
        metadata:
          $ref: '#/components/schemas/TranslationMetadata'
      required:
        - locale
        - translations
        - metadata

    TranslationMetadata:
      type: object
      properties:
        version:
          type: string
        lastUpdated:
          type: string
          format: date-time
        cachedAt:
          type: string
          format: date-time
        locale:
          type: string
        totalKeys:
          type: integer
      required:
        - version
        - lastUpdated
        - locale
        - totalKeys

    CreateTranslationRequest:
      type: object
      properties:
        keyId:
          type: string
          format: uuid
        locale:
          type: string
          enum: [en, th, fr]
        value:
          type: string
          minLength: 1
          maxLength: 10000
        icuMessage:
          type: string
        translatorNotes:
          type: string
          maxLength: 1000
        variables:
          type: array
          items:
            type: string
        submitForReview:
          type: boolean
          default: false
      required:
        - keyId
        - locale
        - value

    TranslationResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          $ref: '#/components/schemas/Translation'
        requestId:
          type: string
        timestamp:
          type: string
          format: date-time
      required:
        - success
        - data
        - requestId
        - timestamp

    Translation:
      type: object
      properties:
        id:
          type: string
          format: uuid
        keyId:
          type: string
          format: uuid
        locale:
          type: string
        value:
          type: string
        status:
          type: string
          enum: [draft, review, approved, published, deprecated]
        version:
          type: integer
        createdAt:
          type: string
          format: date-time
        createdBy:
          type: string
        updatedAt:
          type: string
          format: date-time
        updatedBy:
          type: string
      required:
        - id
        - keyId
        - locale
        - value
        - status
        - version

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          enum: [false]
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
            severity:
              type: string
              enum: [low, medium, high, critical]
            timestamp:
              type: string
              format: date-time
            requestId:
              type: string
          required:
            - code
            - message
            - severity
            - timestamp
            - requestId
      required:
        - success
        - error

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from authentication endpoint

  responses:
    UnauthorizedError:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    ForbiddenError:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

tags:
  - name: Public APIs
    description: Public translation retrieval endpoints
  - name: Admin APIs
    description: Administrative translation management
  - name: WebSocket APIs
    description: Real-time translation updates
```

---

## Summary / สรุป

This comprehensive API reference provides complete documentation for the Translation Management System, covering:

### Public APIs
- **Translation Retrieval**: Optimized endpoints for fetching translations with caching
- **Usage Analytics**: Detailed metrics and performance monitoring
- **Multilingual Support**: Full support for English, Thai, and French locales

### Administrative APIs
- **CRUD Operations**: Complete translation lifecycle management
- **Workflow Management**: Status transitions and approval processes
- **Bulk Operations**: Import/export and batch processing capabilities

### Real-time Features
- **WebSocket APIs**: Live collaboration and instant updates
- **Event Streaming**: Comprehensive event types for system integration
- **Conflict Resolution**: Real-time coordination for concurrent editing

### Enterprise Features
- **Authentication**: Multiple authentication methods for different use cases
- **Rate Limiting**: Robust protection against abuse with clear limits
- **Error Handling**: Comprehensive error codes with detailed troubleshooting
- **SDK Support**: Ready-to-use SDKs for popular programming languages

This API enables developers to build robust, scalable restaurant applications with comprehensive multilingual support, ensuring seamless operations across diverse international markets.

---

**Document Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**API Version**: v1  
**Platform**: Krong Thai SOP Management System  
**OpenAPI Version**: 3.0.3