# Analytics API Documentation

## Overview

The Analytics API provides comprehensive metrics collection, processing, and reporting capabilities for the Knowledge Network React Application. This API enables real-time monitoring, performance tracking, custom reporting, and data export functionality.

## Base URL

```
https://api.knowledge-network.com/api/analytics
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Core Endpoints

### 1. Track Metrics

**POST** `/track`

Track a new analytics event or metric.

#### Request Body

```json
{
  "type": "page_view",
  "dimensions": {
    "page": "/dashboard",
    "category": "main",
    "label": "user_dashboard"
  },
  "measures": {
    "value": 1,
    "duration": 1500,
    "count": 1
  },
  "userId": "user123",
  "sessionId": "session456",
  "metadata": {
    "browser": "Chrome",
    "device": "desktop"
  }
}
```

#### Response

```
Status: 204 No Content
```

### 2. Get Dashboard Data

**GET** `/dashboard`

Retrieve comprehensive dashboard metrics.

#### Query Parameters

- `timeRange` (string): Time range for metrics (e.g., "7d", "30d", "3M")

#### Response

```json
{
  "userEngagement": {
    "userId": "user123",
    "period": "2024-01-01T00:00:00Z",
    "metrics": {
      "sessions": 45,
      "totalDuration": 158400000,
      "averageSessionDuration": 3520000,
      "pageViews": 234,
      "uniquePages": 42,
      "actions": 189,
      "bounceRate": 0.15,
      "documentsCreated": 12,
      "documentsEdited": 34,
      "collaborationTime": 45000000,
      "searchQueries": 67
    }
  },
  "systemHealth": {
    "timestamp": "2024-01-15T10:30:00Z",
    "metrics": {
      "uptime": 864000,
      "cpu": 45.2,
      "memory": 3842.5,
      "activeUsers": 127,
      "apiLatency": {
        "p50": 45,
        "p95": 120,
        "p99": 250
      },
      "errorRate": 0.5,
      "throughput": 1500,
      "queueSize": 23
    }
  },
  "recentErrors": [...],
  "topContent": [...],
  "timeRange": {
    "start": "2024-01-08T00:00:00Z",
    "end": "2024-01-15T00:00:00Z",
    "relative": true,
    "duration": "7d"
  }
}
```

### 3. Get Specific Metrics

**GET** `/metrics/{metricType}`

Retrieve aggregated metrics for a specific type.

#### Path Parameters

- `metricType`: Type of metric (page_view, user_action, api_call, performance, error, etc.)

#### Query Parameters

- `timeRange` (string): Time range for metrics
- `aggregation` (string): Aggregation period (minute, hour, day, week, month)

#### Response

```json
{
  "metrics": [
    {
      "id": "page_view_day_2024-01-15",
      "period": "day",
      "startDate": "2024-01-15T00:00:00Z",
      "endDate": "2024-01-15T23:59:59Z",
      "dimensions": {
        "type": "page_view"
      },
      "metrics": {
        "count": 1234,
        "sum": 1234,
        "avg": 1,
        "min": 1,
        "max": 1,
        "percentiles": {
          "p50": 1,
          "p75": 1,
          "p90": 1,
          "p95": 1,
          "p99": 1
        }
      }
    }
  ],
  "type": "page_view",
  "period": "day",
  "timeRange": {...}
}
```

### 4. Get User Engagement

**GET** `/users/{userId}/engagement`

Get engagement metrics for a specific user.

#### Path Parameters

- `userId`: User identifier

#### Query Parameters

- `timeRange` (string): Time range for metrics

#### Response

```json
{
  "userId": "user123",
  "period": "2024-01-01T00:00:00Z",
  "metrics": {
    "sessions": 12,
    "totalDuration": 43200000,
    "averageSessionDuration": 3600000,
    "pageViews": 156,
    "uniquePages": 28,
    "actions": 89,
    "bounceRate": 0.08,
    "documentsCreated": 5,
    "documentsEdited": 15,
    "collaborationTime": 7200000,
    "searchQueries": 23
  }
}
```

### 5. Get Content Metrics

**GET** `/content/{contentId}/metrics`

Get analytics for specific content.

#### Path Parameters

- `contentId`: Content identifier

#### Query Parameters

- `timeRange` (string): Time range for metrics

#### Response

```json
{
  "contentId": "content123",
  "period": "2024-01-01T00:00:00Z",
  "metrics": {
    "views": 567,
    "uniqueViewers": 234,
    "edits": 23,
    "editors": 8,
    "averageReadTime": 180000,
    "shares": 45,
    "comments": 67,
    "reactions": 89,
    "searchAppearances": 123,
    "searchClicks": 56,
    "qualityScore": 8.5
  }
}
```

### 6. Get Performance Metrics

**GET** `/performance`

Get application performance metrics.

#### Query Parameters

- `page` (string): Optional page filter
- `timeRange` (string): Time range for metrics

#### Response

```json
{
  "metrics": [
    {
      "id": "perf_001",
      "timestamp": "2024-01-15T10:30:00Z",
      "page": "/dashboard",
      "metrics": {
        "fcp": 1200,
        "lcp": 2500,
        "cls": 0.05,
        "inp": 150,
        "ttfb": 400,
        "fid": 50,
        "domContentLoaded": 1800,
        "loadComplete": 3200
      },
      "userAgent": "Mozilla/5.0...",
      "connectionType": "4g"
    }
  ],
  "count": 1,
  "timeRange": {...}
}
```

### 7. Custom Query

**POST** `/query`

Execute a custom analytics query.

#### Request Body

```json
{
  "metrics": ["page_view", "user_action"],
  "dimensions": ["page", "action"],
  "filters": {
    "page": "/dashboard",
    "userId": "user123"
  },
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "aggregation": "day",
  "sortBy": "count:desc",
  "limit": 100
}
```

#### Response

```json
{
  "results": [...],
  "query": {...},
  "count": 100
}
```

## Export Endpoints

### 8. Create Export

**POST** `/export`

Create a new data export job.

#### Request Body

```json
{
  "format": "csv",
  "data": {...},
  "filters": {...},
  "timeRange": {...}
}
```

#### Response

```json
{
  "jobId": "export_123456789",
  "status": "pending"
}
```

### 9. Get Export Status

**GET** `/export/{jobId}`

Check the status of an export job.

#### Response

```json
{
  "id": "export_123456789",
  "type": "metrics",
  "format": "csv",
  "status": "completed",
  "progress": 100,
  "result": {
    "url": "/exports/export_123456789.csv",
    "size": 45678,
    "rows": 1234
  },
  "createdBy": "user123",
  "createdAt": "2024-01-15T10:00:00Z",
  "completedAt": "2024-01-15T10:00:30Z"
}
```

### 10. Download Export

**GET** `/export/{jobId}/download`

Get download URL for completed export.

#### Response

```json
{
  "url": "/exports/export_123456789.csv",
  "filename": "analytics-export-2024-01-15.csv"
}
```

## Report Endpoints

### 11. List Reports

**GET** `/reports`

List all custom reports for the current user.

#### Response

```json
[
  {
    "id": "report_123",
    "name": "Monthly Performance Report",
    "description": "Tracks key performance metrics",
    "query": {...},
    "schedule": {
      "enabled": true,
      "frequency": "monthly",
      "dayOfMonth": 1
    },
    "format": ["csv", "pdf"],
    "createdBy": "user123",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  }
]
```

### 12. Create Report

**POST** `/reports`

Create a new custom report.

#### Request Body

```json
{
  "name": "Weekly Analytics Summary",
  "description": "Summary of key metrics for the week",
  "query": {
    "metrics": ["page_view", "user_action"],
    "dimensions": ["page"],
    "filters": {},
    "timeRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "aggregation": "day",
    "limit": 100
  },
  "schedule": {
    "enabled": true,
    "frequency": "weekly",
    "dayOfWeek": 1,
    "time": "09:00"
  },
  "format": ["csv", "pdf"],
  "recipients": ["admin@example.com"]
}
```

### 13. Get Report

**GET** `/reports/{id}`

Get a specific report configuration.

### 14. Execute Report

**POST** `/reports/{id}/execute`

Execute a report and get results.

#### Request Body (Optional)

```json
{
  "parameters": {
    "customTimeRange": {...}
  }
}
```

### 15. Delete Report

**DELETE** `/reports/{id}`

Delete a custom report.

## WebSocket Events

### Real-time Metrics

Connect to WebSocket endpoint for real-time metrics:

```
wss://api.knowledge-network.com/ws/analytics
```

#### Message Types

**Metric Event**
```json
{
  "type": "metric",
  "data": {
    "metricType": "page_view",
    "dimensions": {...},
    "measures": {...},
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Alert Event**
```json
{
  "type": "alert",
  "data": {
    "alertType": "high_error_rate",
    "severity": "warning",
    "message": "Error rate exceeded threshold",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limiting

- **Standard endpoints**: 100 requests per minute
- **Export endpoints**: 10 requests per minute
- **Query endpoint**: 20 requests per minute
- **WebSocket connections**: 5 concurrent connections per user

## Best Practices

1. **Batch metric tracking**: Send multiple metrics in a single request when possible
2. **Use appropriate time ranges**: Avoid requesting excessive historical data
3. **Cache dashboard data**: Implement client-side caching for dashboard metrics
4. **Use WebSocket for real-time**: Subscribe to WebSocket for live updates instead of polling
5. **Optimize queries**: Use specific filters and aggregations to reduce data transfer

## SDK Examples

### JavaScript/TypeScript

```typescript
import { AnalyticsClient } from '@knowledge-network/analytics-sdk';

const client = new AnalyticsClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.knowledge-network.com'
});

// Track a metric
await client.track({
  type: 'page_view',
  dimensions: { page: '/dashboard' },
  measures: { value: 1 }
});

// Get dashboard data
const dashboard = await client.getDashboard({ timeRange: '7d' });

// Create and execute a report
const report = await client.createReport({
  name: 'My Report',
  query: { metrics: ['page_view'] }
});

const results = await client.executeReport(report.id);
```

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release with core analytics functionality
- Dashboard API endpoints
- Custom reporting system
- Export capabilities
- Real-time WebSocket support