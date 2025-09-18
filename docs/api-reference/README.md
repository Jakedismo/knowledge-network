# API Reference - Knowledge Network

## Overview

The Knowledge Network API provides programmatic access to all platform features. This RESTful API uses JSON for request and response bodies, implements JWT-based authentication, and follows OpenAPI 3.0 specifications.

## Base URL

```
Production: https://api.knowledgenetwork.com/v1
Staging: https://api-staging.knowledgenetwork.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

### JWT Token Authentication

The API uses JWT (JSON Web Token) for authentication. Tokens are obtained through the authentication endpoint and must be included in all subsequent requests.

#### Obtaining Tokens

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

#### Using Tokens

Include the access token in the Authorization header:

```http
GET /documents
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### Refreshing Tokens

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### API Key Authentication (Enterprise)

Enterprise customers can use API keys for server-to-server communication:

```http
GET /documents
X-API-Key: sk_live_abcdef123456789
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_abc123"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

## Rate Limiting

API requests are rate-limited to ensure platform stability:

- **Authenticated requests**: 1000 requests per 15 minutes
- **Unauthenticated requests**: 100 requests per 15 minutes
- **Enterprise tier**: Custom limits available

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Pagination

List endpoints support pagination using cursor-based pagination:

```http
GET /documents?limit=20&cursor=eyJpZCI6MTIzNH0
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTI1NH0",
    "totalCount": 150
  }
}
```

## Core Endpoints

### Documents

#### Create Document

```http
POST /documents
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "API Documentation",
  "content": "# Welcome\n\nThis is the content...",
  "collectionId": "col_abc123",
  "tags": ["api", "documentation"],
  "status": "draft"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "doc_xyz789",
    "title": "API Documentation",
    "content": "# Welcome\n\nThis is the content...",
    "collectionId": "col_abc123",
    "authorId": "user_123",
    "tags": ["api", "documentation"],
    "status": "draft",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "version": 1
  }
}
```

#### Get Document

```http
GET /documents/{documentId}
Authorization: Bearer {token}
```

#### Update Document

```http
PATCH /documents/{documentId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Updated Title",
  "content": "Updated content...",
  "status": "published"
}
```

#### Delete Document

```http
DELETE /documents/{documentId}
Authorization: Bearer {token}
```

#### List Documents

```http
GET /documents
  ?collectionId={collectionId}
  &status={status}
  &tags={tag1,tag2}
  &search={query}
  &sort={field}
  &order={asc|desc}
  &limit={limit}
  &cursor={cursor}
Authorization: Bearer {token}
```

### Collections

#### Create Collection

```http
POST /collections
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Product Documentation",
  "description": "All product-related documentation",
  "parentId": null,
  "permissions": {
    "view": ["team"],
    "edit": ["editors"],
    "admin": ["admins"]
  }
}
```

#### Get Collection

```http
GET /collections/{collectionId}
Authorization: Bearer {token}
```

#### Update Collection

```http
PATCH /collections/{collectionId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Delete Collection

```http
DELETE /collections/{collectionId}
Authorization: Bearer {token}
```

### Search

#### Full-Text Search

```http
POST /search
Content-Type: application/json
Authorization: Bearer {token}

{
  "query": "search terms",
  "filters": {
    "collections": ["col_123", "col_456"],
    "tags": ["important"],
    "dateRange": {
      "from": "2025-01-01",
      "to": "2025-01-31"
    }
  },
  "options": {
    "highlight": true,
    "limit": 20,
    "offset": 0
  }
}
```

#### Semantic Search

```http
POST /search/semantic
Content-Type: application/json
Authorization: Bearer {token}

{
  "query": "How to implement authentication?",
  "context": "development",
  "limit": 10
}
```

### Users

#### Get Current User

```http
GET /users/me
Authorization: Bearer {token}
```

#### Update User Profile

```http
PATCH /users/me
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Updated Name",
  "avatar": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

#### List Users (Admin)

```http
GET /users
  ?role={role}
  &status={status}
  &search={query}
  &limit={limit}
  &cursor={cursor}
Authorization: Bearer {token}
```

### Workspaces

#### Create Workspace

```http
POST /workspaces
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Engineering Team",
  "description": "Engineering documentation and knowledge",
  "settings": {
    "allowPublicAccess": false,
    "defaultPermissions": "view"
  }
}
```

#### Get Workspace

```http
GET /workspaces/{workspaceId}
Authorization: Bearer {token}
```

#### Update Workspace

```http
PATCH /workspaces/{workspaceId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Updated Name",
  "settings": {
    "allowPublicAccess": true
  }
}
```

### Analytics

#### Get Document Analytics

```http
GET /analytics/documents/{documentId}
  ?period={day|week|month|year}
  &from={date}
  &to={date}
Authorization: Bearer {token}
```

Response:
```json
{
  "data": {
    "views": 1234,
    "uniqueViewers": 456,
    "avgReadTime": 180,
    "engagement": {
      "likes": 23,
      "comments": 15,
      "shares": 8
    },
    "timeline": [
      {
        "date": "2025-01-15",
        "views": 45,
        "uniqueViewers": 30
      }
    ]
  }
}
```

#### Get Workspace Analytics

```http
GET /analytics/workspaces/{workspaceId}
  ?period={period}
  &metrics={metrics}
Authorization: Bearer {token}
```

### Collaboration

#### Create Comment

```http
POST /documents/{documentId}/comments
Content-Type: application/json
Authorization: Bearer {token}

{
  "content": "This needs clarification.",
  "parentId": null,
  "mentions": ["user_456"],
  "selection": {
    "start": 100,
    "end": 150
  }
}
```

#### Get Comments

```http
GET /documents/{documentId}/comments
  ?includeReplies=true
  &limit={limit}
  &cursor={cursor}
Authorization: Bearer {token}
```

#### Real-time Collaboration (WebSocket)

```javascript
// Connect to WebSocket
const ws = new WebSocket('wss://api.knowledgenetwork.com/v1/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'Bearer eyJhbGciOiJIUzI1NiIs...'
}));

// Join document session
ws.send(JSON.stringify({
  type: 'join',
  documentId: 'doc_xyz789'
}));

// Send cursor position
ws.send(JSON.stringify({
  type: 'cursor',
  position: { line: 10, column: 5 }
}));

// Send content changes
ws.send(JSON.stringify({
  type: 'change',
  operations: [
    { op: 'insert', position: 100, text: 'Hello' }
  ]
}));
```

## Advanced Features

### Batch Operations

```http
POST /batch
Content-Type: application/json
Authorization: Bearer {token}

{
  "operations": [
    {
      "method": "POST",
      "path": "/documents",
      "body": { "title": "Doc 1", "content": "..." }
    },
    {
      "method": "PATCH",
      "path": "/documents/doc_123",
      "body": { "status": "published" }
    }
  ]
}
```

### Webhooks (Enterprise)

```http
POST /webhooks
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "https://example.com/webhook",
  "events": ["document.created", "document.updated"],
  "secret": "webhook_secret_key"
}
```

### Export

```http
POST /export
Content-Type: application/json
Authorization: Bearer {token}

{
  "format": "pdf",
  "documentIds": ["doc_1", "doc_2"],
  "options": {
    "includeCover": true,
    "includeComments": false,
    "paperSize": "A4"
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH_REQUIRED | Authentication required | 401 |
| AUTH_INVALID | Invalid authentication credentials | 401 |
| FORBIDDEN | Insufficient permissions | 403 |
| NOT_FOUND | Resource not found | 404 |
| VALIDATION_ERROR | Invalid request parameters | 400 |
| RATE_LIMIT_EXCEEDED | Too many requests | 429 |
| SERVER_ERROR | Internal server error | 500 |
| SERVICE_UNAVAILABLE | Service temporarily unavailable | 503 |

## SDKs and Libraries

### Official SDKs

- **JavaScript/TypeScript**: `npm install @knowledge-network/sdk`
- **Python**: `pip install knowledge-network`
- **Go**: `go get github.com/knowledge-network/go-sdk`
- **Ruby**: `gem install knowledge_network`

### Example Usage (JavaScript)

```javascript
import { KnowledgeNetworkClient } from '@knowledge-network/sdk';

const client = new KnowledgeNetworkClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.knowledgenetwork.com/v1'
});

// Create a document
const document = await client.documents.create({
  title: 'My Document',
  content: 'Document content...',
  collectionId: 'col_123'
});

// Search documents
const results = await client.search.query({
  query: 'search terms',
  filters: { tags: ['important'] }
});
```

## GraphQL API (Beta)

GraphQL endpoint: `https://api.knowledgenetwork.com/graphql`

```graphql
query GetDocument($id: ID!) {
  document(id: $id) {
    id
    title
    content
    author {
      id
      name
      email
    }
    collection {
      id
      name
    }
    comments {
      edges {
        node {
          id
          content
          author {
            name
          }
        }
      }
    }
  }
}
```

## Testing

### Postman Collection

Download our Postman collection for easy API testing:
[Download Postman Collection](https://api.knowledgenetwork.com/postman)

### cURL Examples

```bash
# Get document
curl -X GET https://api.knowledgenetwork.com/v1/documents/doc_123 \
  -H "Authorization: Bearer your_token"

# Create document
curl -X POST https://api.knowledgenetwork.com/v1/documents \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Doc","content":"Content..."}'
```

## API Changelog

### Version 1.0.0 (2025-01-15)
- Initial API release
- Core CRUD operations for documents and collections
- Authentication and authorization
- Search functionality
- Real-time collaboration via WebSocket

### Coming Soon
- GraphQL API (full release)
- Batch operations enhancement
- AI-powered features API
- Advanced analytics endpoints
- Mobile-specific endpoints

## Support

- **API Status**: https://status.knowledgenetwork.com
- **Documentation**: https://docs.knowledgenetwork.com/api
- **Support Email**: api-support@knowledgenetwork.com
- **Developer Forum**: https://community.knowledgenetwork.com/developers

---

© 2025 Knowledge Network. API Documentation v1.0