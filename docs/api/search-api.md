# Search API Documentation

## Overview

The Knowledge Network Search API provides powerful full-text search capabilities with faceted filtering, real-time updates, and permission-aware results. Built on ElasticSearch 8.11.3, it delivers sub-500ms response times for complex queries across large document sets.

## Base URL

```
https://api.knowledge-network.com/api/search
```

## Authentication

All search endpoints require authentication via JWT token:

```http
Authorization: Bearer <jwt-token>
```

## Endpoints

### 1. Search Documents

**GET** `/api/search`

Perform a full-text search across knowledge documents.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search query text (max 500 chars) |
| `workspace` | uuid | Yes | Workspace ID to search within |
| `collections` | string | No | Comma-separated collection IDs |
| `tags` | string | No | Comma-separated tag names |
| `authors` | string | No | Comma-separated author IDs |
| `status` | string | No | Comma-separated status values (DRAFT,REVIEW,PUBLISHED,ARCHIVED) |
| `dateFrom` | string | No | Start date (ISO 8601 format) |
| `dateTo` | string | No | End date (ISO 8601 format) |
| `sort` | string | No | Sort field (relevance,createdAt,updatedAt,viewCount,title) |
| `order` | string | No | Sort order (asc,desc) |
| `page` | integer | No | Page number (1-1000, default: 1) |
| `size` | integer | No | Results per page (1-100, default: 20) |
| `facets` | boolean | No | Include facet aggregations |
| `highlight` | boolean | No | Include search highlighting (default: true) |
| `debug` | boolean | No | Include debug information |

#### Response

```json
{
  "hits": [
    {
      "document": {
        "id": "doc-123",
        "title": "Getting Started with TypeScript",
        "content": "TypeScript is a typed superset of JavaScript...",
        "excerpt": "Learn the basics of TypeScript...",
        "status": "PUBLISHED",
        "author": {
          "id": "user-456",
          "displayName": "John Doe"
        },
        "collection": {
          "id": "col-789",
          "name": "Tutorials",
          "path": "Documentation / Tutorials"
        },
        "tags": [
          {
            "id": "tag-1",
            "name": "typescript",
            "color": "#007ACC"
          }
        ],
        "viewCount": 1523,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-20T14:45:00Z"
      },
      "score": 8.5,
      "highlights": {
        "title": ["Getting Started with <mark>TypeScript</mark>"],
        "content": ["<mark>TypeScript</mark> is a typed superset..."]
      }
    }
  ],
  "total": 42,
  "facets": {
    "collections": [
      {
        "id": "col-789",
        "name": "Tutorials",
        "count": 15
      }
    ],
    "tags": [
      {
        "id": "tag-1",
        "name": "typescript",
        "color": "#007ACC",
        "count": 23
      }
    ],
    "authors": [
      {
        "id": "user-456",
        "displayName": "John Doe",
        "count": 8
      }
    ],
    "status": [
      {
        "status": "PUBLISHED",
        "count": 35
      }
    ]
  },
  "took": 127
}
```

#### Example Request

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.knowledge-network.com/api/search?q=typescript&workspace=ws-123&facets=true&page=1&size=20"
```

### 2. Advanced Search

**POST** `/api/search`

Perform an advanced search with complex filters in the request body.

#### Request Body

```json
{
  "query": "typescript react",
  "workspaceId": "workspace-123",
  "filters": {
    "collections": ["col-1", "col-2"],
    "tags": ["typescript", "react"],
    "authors": ["user-1", "user-2"],
    "status": ["PUBLISHED", "REVIEW"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "metadata": {
      "category": ["tutorial", "guide"],
      "difficulty": ["beginner", "intermediate"]
    }
  },
  "sort": {
    "field": "createdAt",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "size": 20
  },
  "facets": true,
  "highlight": true,
  "includeDebug": false
}
```

#### Response

Same as GET search endpoint.

### 3. Search Suggestions

**GET** `/api/search/suggest`

Get autocomplete suggestions based on partial query.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Partial query (min 1 char) |
| `workspace` | uuid | Yes | Workspace ID |
| `size` | integer | No | Number of suggestions (1-20, default: 10) |

#### Response

```json
{
  "suggestions": [
    "TypeScript Tutorial",
    "TypeScript Guide",
    "TypeScript Best Practices"
  ]
}
```

### 4. Search Facets

**GET** `/api/search/facets`

Get available search facets without performing a search.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace` | uuid | Yes | Workspace ID |

#### Response

```json
{
  "collections": [
    {
      "id": "col-1",
      "name": "Tutorials",
      "count": 45
    }
  ],
  "tags": [
    {
      "id": "tag-1",
      "name": "javascript",
      "count": 120
    }
  ],
  "authors": [
    {
      "id": "user-1",
      "displayName": "Jane Smith",
      "count": 32
    }
  ],
  "status": [
    {
      "status": "PUBLISHED",
      "count": 200
    }
  ]
}
```

### 5. Search Metrics

**GET** `/api/search/metrics`

Get search performance metrics and analytics.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace` | uuid | No | Workspace ID (omit for global) |
| `days` | integer | No | Number of days to analyze (default: 7) |

#### Response

```json
{
  "avgResponseTime": 145,
  "p95ResponseTime": 320,
  "totalQueries": 5420,
  "zeroResults": 89,
  "errorRate": 0.02,
  "cacheHitRate": 0.65,
  "indexSize": 524288000,
  "documentCount": 12500,
  "popularQueries": [
    {
      "query": "typescript",
      "count": 234
    }
  ],
  "trendsOverTime": [
    {
      "date": "2024-01-15",
      "queries": 780,
      "avgResponseTime": 142
    }
  ]
}
```

## Search Query Syntax

### Basic Search

Simple keyword search:
```
typescript tutorial
```

### Phrase Search

Exact phrase matching with quotes:
```
"getting started with typescript"
```

### Boolean Operators

Complex queries with AND, OR, NOT:
```
typescript AND (react OR vue) NOT angular
```

### Wildcard Search

Pattern matching with wildcards:
```
type* // Matches: typescript, types, typed
```

### Field-Specific Search

Search within specific fields:
```
title:typescript content:tutorial
```

### Fuzzy Search

Approximate matching for typos:
```
typscript~2 // Matches: typescript (2 edit distance)
```

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid request parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - No access to workspace |
| 429 | Too many requests - Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable - Circuit breaker open |

## Rate Limiting

- **Standard tier**: 100 requests per minute
- **Premium tier**: 500 requests per minute
- **Enterprise tier**: Unlimited

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642435200
```

## Performance Guarantees

| Metric | Target | SLA |
|--------|--------|-----|
| Response time (p50) | < 100ms | 99.9% |
| Response time (p95) | < 500ms | 99% |
| Response time (p99) | < 1000ms | 95% |
| Availability | 99.95% | Monthly |
| Index latency | < 100ms | 99% |

## Caching

Search results are cached with the following TTLs:

- **Search results**: 60 seconds
- **Suggestions**: 300 seconds
- **Facets**: 300 seconds

Cache headers:
```http
Cache-Control: private, max-age=60
ETag: "33a64df551"
```

## Webhooks

Subscribe to search events via webhooks:

```json
{
  "event": "search.performed",
  "data": {
    "query": "typescript",
    "workspaceId": "workspace-123",
    "userId": "user-456",
    "resultCount": 42,
    "responseTime": 127
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { SearchClient } from '@knowledge-network/search-sdk';

const client = new SearchClient({
  apiKey: process.env.API_KEY
});

// Simple search
const results = await client.search({
  query: 'typescript',
  workspaceId: 'workspace-123'
});

// Advanced search
const advancedResults = await client.advancedSearch({
  query: 'typescript',
  filters: {
    tags: ['javascript', 'tutorial'],
    status: ['PUBLISHED']
  },
  facets: true
});

// Get suggestions
const suggestions = await client.suggest({
  query: 'type',
  workspaceId: 'workspace-123'
});
```

### Python

```python
from knowledge_network import SearchClient

client = SearchClient(api_key=os.environ['API_KEY'])

# Simple search
results = client.search(
    query='typescript',
    workspace_id='workspace-123'
)

# With filters
filtered = client.search(
    query='tutorial',
    workspace_id='workspace-123',
    filters={
        'tags': ['python', 'tutorial'],
        'status': ['PUBLISHED']
    }
)
```

### cURL

```bash
# Simple search
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.knowledge-network.com/api/search?q=typescript&workspace=ws-123"

# Advanced search
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"typescript","workspaceId":"ws-123","facets":true}' \
  "https://api.knowledge-network.com/api/search"
```

## Best Practices

1. **Use filters to narrow results** - Combine text search with filters for better precision
2. **Enable caching** - Respect cache headers to reduce load
3. **Batch requests** - Use bulk operations when possible
4. **Handle errors gracefully** - Implement exponential backoff for retries
5. **Monitor rate limits** - Track rate limit headers
6. **Use appropriate page sizes** - Balance between response time and data transfer
7. **Implement debouncing** - For autocomplete, debounce requests by 200-300ms
8. **Use field boosting** - Leverage title and excerpt boosting for better relevance

## Migration Guide

For users migrating from the old search system:

1. **Update authentication** - Switch from API keys to JWT tokens
2. **Update endpoints** - Change `/v1/search` to `/api/search`
3. **Update response parsing** - New response structure with `hits` array
4. **Update filters** - Use new filter syntax with arrays
5. **Update SDKs** - Upgrade to v2.0+ of official SDKs

## Support

- **Documentation**: https://docs.knowledge-network.com/search
- **API Status**: https://status.knowledge-network.com
- **Support Email**: search-support@knowledge-network.com
- **Discord**: https://discord.gg/knowledge-network