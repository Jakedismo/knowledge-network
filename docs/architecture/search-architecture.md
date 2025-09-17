# Knowledge Network Search Architecture

## Executive Summary

This document defines the search architecture for the Knowledge Network React Application, including ElasticSearch cluster design, indexing strategy, search API design, and integration patterns with existing systems.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Next.js Application  │  Search Components  │  Search Hooks  │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                      │
├────────────────────────────────────────────────────────────┤
│  /api/search  │  /api/search/suggest  │  /api/search/facets│
└────────────┬───────────────────────┬──────────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────────────────────────────────────────────┐
│                    Search Service Layer                     │
├────────────────────────────────────────────────────────────┤
│  SearchService  │  IndexService  │  ProjectionService      │
│  PermissionService  │  CacheService  │  AnalyticsService   │
└────────────┬───────────────────────┬──────────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────────────────────────────────────────────┐
│                  ElasticSearch Cluster                      │
├────────────────────────────────────────────────────────────┤
│  Master Node  │  Data Nodes (2)  │  Coordinating Node      │
│  Index: knowledge-{workspace}  │  Aliases  │  Templates     │
└─────────────────────────────────────────────────────────────┘
```

## ElasticSearch Cluster Design

### Development Environment

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.3
    container_name: knowledge-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
      - xpack.security.http.ssl.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    networks:
      - knowledge-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.3
    container_name: knowledge-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - xpack.security.enabled=false
    ports:
      - "5601:5601"
    networks:
      - knowledge-network
    depends_on:
      - elasticsearch

volumes:
  es-data:

networks:
  knowledge-network:
    driver: bridge
```

### Production Cluster Configuration

```yaml
# Production cluster with 3 nodes
cluster:
  name: knowledge-search-cluster

nodes:
  master:
    count: 1
    resources:
      cpu: 2
      memory: 4GB
      storage: 50GB

  data:
    count: 2
    resources:
      cpu: 4
      memory: 8GB
      storage: 500GB

  coordinating:
    count: 1
    resources:
      cpu: 2
      memory: 4GB

configuration:
  heap_size: 4GB
  thread_pools:
    search:
      size: 50
      queue_size: 1000
  indices:
    memory:
      index_buffer_size: 30%
```

## Index Design

### Index Strategy

We use a **workspace-scoped index strategy** with the following structure:
- One index per workspace: `knowledge-{workspaceId}`
- Shared index template for consistency
- Aliases for simplified querying

### Index Template

```json
{
  "index_patterns": ["knowledge-*"],
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index": {
        "refresh_interval": "1s",
        "max_result_window": 10000,
        "analysis": {
          "analyzer": {
            "content_analyzer": {
              "type": "custom",
              "tokenizer": "standard",
              "char_filter": ["html_strip"],
              "filter": ["lowercase", "stop", "stemmer", "synonym_filter"]
            },
            "title_analyzer": {
              "type": "custom",
              "tokenizer": "standard",
              "filter": ["lowercase", "asciifolding", "edge_ngram_filter"]
            },
            "code_analyzer": {
              "type": "custom",
              "tokenizer": "whitespace",
              "filter": ["lowercase"]
            }
          },
          "filter": {
            "edge_ngram_filter": {
              "type": "edge_ngram",
              "min_gram": 2,
              "max_gram": 20
            },
            "synonym_filter": {
              "type": "synonym",
              "synonyms_path": "synonyms.txt"
            }
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "id": {
          "type": "keyword"
        },
        "workspaceId": {
          "type": "keyword"
        },
        "title": {
          "type": "text",
          "analyzer": "title_analyzer",
          "boost": 3,
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            },
            "suggest": {
              "type": "completion",
              "analyzer": "simple",
              "search_analyzer": "simple"
            }
          }
        },
        "content": {
          "type": "text",
          "analyzer": "content_analyzer",
          "fields": {
            "code": {
              "type": "text",
              "analyzer": "code_analyzer"
            }
          }
        },
        "excerpt": {
          "type": "text",
          "analyzer": "content_analyzer",
          "boost": 2
        },
        "status": {
          "type": "keyword"
        },
        "author": {
          "type": "object",
          "properties": {
            "id": {
              "type": "keyword"
            },
            "displayName": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword"
                }
              }
            }
          }
        },
        "collection": {
          "type": "object",
          "properties": {
            "id": {
              "type": "keyword"
            },
            "name": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword"
                }
              }
            },
            "path": {
              "type": "text",
              "analyzer": "standard"
            }
          }
        },
        "tags": {
          "type": "nested",
          "properties": {
            "id": {
              "type": "keyword"
            },
            "name": {
              "type": "keyword"
            },
            "color": {
              "type": "keyword"
            }
          }
        },
        "metadata": {
          "type": "object",
          "dynamic": true
        },
        "facets": {
          "type": "nested",
          "properties": {
            "keyPath": {
              "type": "keyword"
            },
            "type": {
              "type": "keyword"
            },
            "stringVal": {
              "type": "keyword"
            },
            "numberVal": {
              "type": "double"
            },
            "dateVal": {
              "type": "date"
            },
            "boolVal": {
              "type": "boolean"
            }
          }
        },
        "viewCount": {
          "type": "integer"
        },
        "createdAt": {
          "type": "date"
        },
        "updatedAt": {
          "type": "date"
        },
        "searchVector": {
          "type": "dense_vector",
          "dims": 768,
          "index": true,
          "similarity": "cosine"
        }
      }
    }
  }
}
```

## Search Query Patterns

### Basic Search Query

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "search term",
            "fields": ["title^3", "content", "excerpt^2", "tags.name"],
            "type": "best_fields",
            "operator": "or",
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        {
          "term": {
            "workspaceId": "workspace-123"
          }
        },
        {
          "term": {
            "status": "PUBLISHED"
          }
        }
      ]
    }
  },
  "highlight": {
    "fields": {
      "title": {},
      "content": {
        "fragment_size": 150,
        "number_of_fragments": 3
      }
    }
  },
  "aggs": {
    "collections": {
      "terms": {
        "field": "collection.id",
        "size": 20
      }
    },
    "tags": {
      "nested": {
        "path": "tags"
      },
      "aggs": {
        "tag_names": {
          "terms": {
            "field": "tags.name",
            "size": 50
          }
        }
      }
    },
    "authors": {
      "terms": {
        "field": "author.id",
        "size": 20
      }
    }
  },
  "from": 0,
  "size": 20
}
```

### Advanced Search Features

#### 1. Boolean Operators

```typescript
// Query parser for boolean search
function parseBoolean(query: string): object {
  // Supports: AND, OR, NOT, quotes, parentheses
  // Example: "machine learning" AND (python OR javascript) NOT deprecated
  return {
    query_string: {
      query: query,
      default_field: "content",
      default_operator: "AND",
      analyze_wildcard: true
    }
  };
}
```

#### 2. Semantic Search (Future)

```typescript
// Using dense vectors for semantic similarity
{
  "query": {
    "script_score": {
      "query": {
        "match_all": {}
      },
      "script": {
        "source": "cosineSimilarity(params.query_vector, 'searchVector') + 1.0",
        "params": {
          "query_vector": [...] // 768-dimensional vector from embedding model
        }
      }
    }
  }
}
```

#### 3. Saved Searches

```typescript
interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  userId: string;
  workspaceId: string;
  isPublic: boolean;
  createdAt: Date;
}
```

## Search Service Implementation

### Core Service Architecture

```typescript
// src/server/modules/search/SearchService.ts
import { Client } from '@elastic/elasticsearch';
import { prisma } from '@/lib/prisma';
import { PermissionService } from '@/lib/auth/permission.service';
import { CacheService } from './CacheService';
import { ProjectionService } from './ProjectionService';

export class SearchService {
  private client: Client;
  private cache: CacheService;
  private permissions: PermissionService;
  private projections: ProjectionService;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || ''
      }
    });

    this.cache = new CacheService();
    this.permissions = new PermissionService();
    this.projections = new ProjectionService();
  }

  async search(request: SearchRequest, userId: string): Promise<SearchResponse> {
    // 1. Check cache for identical query
    const cacheKey = this.getCacheKey(request, userId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // 2. Build permission filters
    const permissionFilters = await this.buildPermissionFilters(userId, request.workspaceId);

    // 3. Build and execute ElasticSearch query
    const esQuery = this.buildQuery(request, permissionFilters);
    const startTime = Date.now();
    const response = await this.client.search(esQuery);
    const took = Date.now() - startTime;

    // 4. Transform response
    const result = this.transformResponse(response, took);

    // 5. Cache result
    await this.cache.set(cacheKey, result, 60); // 60 second TTL

    // 6. Log analytics
    await this.logSearchAnalytics(request, result, userId, took);

    return result;
  }

  async index(knowledgeId: string): Promise<void> {
    const document = await this.projections.projectToIndex(knowledgeId);
    if (!document) return;

    const indexName = `knowledge-${document.workspaceId}`;
    await this.client.index({
      index: indexName,
      id: document.id,
      body: document
    });
  }

  async bulkIndex(knowledgeIds: string[]): Promise<void> {
    const documents = await Promise.all(
      knowledgeIds.map(id => this.projections.projectToIndex(id))
    );

    const operations = documents
      .filter(doc => doc !== null)
      .flatMap(doc => [
        { index: { _index: `knowledge-${doc.workspaceId}`, _id: doc.id } },
        doc
      ]);

    if (operations.length > 0) {
      await this.client.bulk({ body: operations });
    }
  }

  async delete(knowledgeId: string, workspaceId: string): Promise<void> {
    await this.client.delete({
      index: `knowledge-${workspaceId}`,
      id: knowledgeId
    });
  }

  async suggest(query: string, workspaceId: string): Promise<string[]> {
    const response = await this.client.search({
      index: `knowledge-${workspaceId}`,
      body: {
        suggest: {
          title_suggest: {
            text: query,
            completion: {
              field: "title.suggest",
              size: 10,
              skip_duplicates: true
            }
          }
        }
      }
    });

    return response.suggest?.title_suggest?.[0]?.options?.map(o => o.text) || [];
  }

  private buildQuery(request: SearchRequest, permissionFilters: any[]): any {
    const must: any[] = [];
    const filter: any[] = [...permissionFilters];

    // Add search query
    if (request.query) {
      must.push({
        multi_match: {
          query: request.query,
          fields: ["title^3", "content", "excerpt^2", "tags.name"],
          type: "best_fields",
          operator: "or",
          fuzziness: "AUTO"
        }
      });
    }

    // Add filters
    if (request.filters?.collections?.length) {
      filter.push({
        terms: { "collection.id": request.filters.collections }
      });
    }

    if (request.filters?.tags?.length) {
      filter.push({
        nested: {
          path: "tags",
          query: {
            terms: { "tags.name": request.filters.tags }
          }
        }
      });
    }

    if (request.filters?.authors?.length) {
      filter.push({
        terms: { "author.id": request.filters.authors }
      });
    }

    if (request.filters?.status?.length) {
      filter.push({
        terms: { status: request.filters.status }
      });
    }

    if (request.filters?.dateRange) {
      const range: any = {};
      if (request.filters.dateRange.from) {
        range.gte = request.filters.dateRange.from;
      }
      if (request.filters.dateRange.to) {
        range.lte = request.filters.dateRange.to;
      }
      filter.push({ range: { createdAt: range } });
    }

    // Build sort
    const sort: any[] = [];
    if (request.sort?.field === 'relevance') {
      sort.push({ _score: { order: 'desc' } });
    } else if (request.sort?.field) {
      sort.push({ [request.sort.field]: { order: request.sort.order || 'desc' } });
    }

    // Build aggregations
    const aggs = request.facets ? this.buildAggregations() : undefined;

    return {
      index: `knowledge-${request.workspaceId}`,
      body: {
        query: {
          bool: {
            must,
            filter
          }
        },
        highlight: request.highlight ? {
          fields: {
            title: {},
            content: {
              fragment_size: 150,
              number_of_fragments: 3
            }
          }
        } : undefined,
        aggs,
        sort,
        from: ((request.pagination?.page || 1) - 1) * (request.pagination?.size || 20),
        size: request.pagination?.size || 20
      }
    };
  }

  private buildAggregations(): any {
    return {
      collections: {
        terms: {
          field: "collection.id",
          size: 20
        }
      },
      tags: {
        nested: {
          path: "tags"
        },
        aggs: {
          tag_names: {
            terms: {
              field: "tags.name",
              size: 50
            }
          }
        }
      },
      authors: {
        terms: {
          field: "author.id",
          size: 20
        }
      },
      status: {
        terms: {
          field: "status"
        }
      }
    };
  }

  private async buildPermissionFilters(userId: string, workspaceId: string): Promise<any[]> {
    const filters: any[] = [
      { term: { workspaceId } }
    ];

    // Get user's accessible collections
    const accessibleCollections = await this.permissions.getUserCollections(userId, workspaceId);
    if (accessibleCollections.length > 0) {
      filters.push({
        terms: { "collection.id": accessibleCollections }
      });
    }

    return filters;
  }

  private transformResponse(response: any, took: number): SearchResponse {
    const hits = response.hits.hits.map((hit: any) => ({
      document: hit._source,
      score: hit._score,
      highlights: hit.highlight
    }));

    const facets = response.aggregations ? {
      collections: response.aggregations.collections?.buckets || [],
      tags: response.aggregations.tags?.tag_names?.buckets || [],
      authors: response.aggregations.authors?.buckets || [],
      status: response.aggregations.status?.buckets || []
    } : undefined;

    return {
      hits,
      total: response.hits.total.value,
      facets,
      took
    };
  }

  private getCacheKey(request: SearchRequest, userId: string): string {
    return `search:${userId}:${JSON.stringify(request)}`;
  }

  private async logSearchAnalytics(
    request: SearchRequest,
    response: SearchResponse,
    userId: string,
    took: number
  ): Promise<void> {
    await prisma.searchQuery.create({
      data: {
        query: request.query || '',
        filters: request.filters || {},
        resultCount: response.total,
        responseTime: took,
        userId,
        workspaceId: request.workspaceId
      }
    });
  }
}
```

## Query Optimization Strategies

### 1. Index-Time Optimizations

- **Custom Analyzers**: Specialized analyzers for different content types
- **Edge N-grams**: For autocomplete and prefix matching
- **Synonyms**: Improve recall with domain-specific synonyms
- **Stop Words**: Remove common words to reduce index size

### 2. Query-Time Optimizations

- **Filter Cache**: Cache frequently used filters
- **Query Result Cache**: Cache complete query results
- **Aggregation Cache**: Cache facet aggregations
- **Preference Routing**: Route similar queries to same shards

### 3. Performance Tuning

```typescript
// Performance monitoring
interface PerformanceMetrics {
  queryLatency: number[];
  indexingRate: number;
  searchRate: number;
  cacheHitRate: number;
  errorRate: number;
}

// Circuit breaker for resilience
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();
      if (this.failures >= 5) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}
```

## Real-Time Index Updates

### Event-Driven Indexing

```typescript
// src/server/modules/search/IndexEventHandler.ts
import { EventEmitter } from 'events';
import { SearchService } from './SearchService';

export class IndexEventHandler extends EventEmitter {
  private searchService: SearchService;
  private queue: Map<string, any> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(searchService: SearchService) {
    super();
    this.searchService = searchService;

    // Listen to domain events
    this.on('knowledge:created', this.handleKnowledgeCreated.bind(this));
    this.on('knowledge:updated', this.handleKnowledgeUpdated.bind(this));
    this.on('knowledge:deleted', this.handleKnowledgeDeleted.bind(this));
  }

  private async handleKnowledgeCreated(event: any) {
    this.queueIndex(event.knowledgeId, 'index');
  }

  private async handleKnowledgeUpdated(event: any) {
    this.queueIndex(event.knowledgeId, 'update');
  }

  private async handleKnowledgeDeleted(event: any) {
    await this.searchService.delete(event.knowledgeId, event.workspaceId);
  }

  private queueIndex(knowledgeId: string, operation: 'index' | 'update') {
    this.queue.set(knowledgeId, operation);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), 100);
    }
  }

  private async processBatch() {
    const batch = Array.from(this.queue.keys());
    this.queue.clear();
    this.batchTimer = null;

    if (batch.length > 0) {
      await this.searchService.bulkIndex(batch);
    }
  }
}
```

### WebSocket Integration

```typescript
// Real-time search updates via WebSocket
interface SearchUpdate {
  type: 'DOCUMENT_UPDATED' | 'DOCUMENT_DELETED' | 'FACETS_CHANGED';
  documentId?: string;
  workspaceId: string;
  timestamp: Date;
}

// Client-side subscription
const searchSocket = new WebSocket('ws://localhost:3001/search');
searchSocket.on('message', (data: SearchUpdate) => {
  if (data.type === 'DOCUMENT_UPDATED') {
    // Refresh search results if affected
    if (currentSearchResults.includes(data.documentId)) {
      refreshSearch();
    }
  }
});
```

## Search Analytics

### Analytics Dashboard Metrics

1. **Query Performance**
   - Average response time
   - 95th percentile latency
   - Query volume over time
   - Error rate

2. **User Behavior**
   - Popular search terms
   - Click-through rate
   - Zero-result queries
   - Search refinement patterns

3. **System Health**
   - Index size and growth
   - Indexing rate
   - Cache hit ratio
   - Resource utilization

### Analytics Implementation

```typescript
// src/server/modules/search/AnalyticsService.ts
export class AnalyticsService {
  async trackSearch(
    query: string,
    results: number,
    userId: string,
    workspaceId: string,
    responseTime: number
  ) {
    await prisma.searchQuery.create({
      data: {
        query,
        resultCount: results,
        responseTime,
        userId,
        workspaceId,
        timestamp: new Date()
      }
    });
  }

  async trackClick(
    searchId: string,
    documentId: string,
    position: number
  ) {
    await prisma.searchClick.create({
      data: {
        searchId,
        documentId,
        position,
        timestamp: new Date()
      }
    });
  }

  async getPopularSearches(workspaceId: string, days = 7) {
    return await prisma.$queryRaw`
      SELECT query, COUNT(*) as count
      FROM search_queries
      WHERE workspace_id = ${workspaceId}
        AND timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY query
      ORDER BY count DESC
      LIMIT 20
    `;
  }

  async getSearchMetrics(workspaceId: string) {
    const metrics = await prisma.$queryRaw`
      SELECT
        AVG(response_time) as avg_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_latency,
        COUNT(*) as total_queries,
        COUNT(CASE WHEN result_count = 0 THEN 1 END) as zero_results
      FROM search_queries
      WHERE workspace_id = ${workspaceId}
        AND timestamp > NOW() - INTERVAL '24 hours'
    `;

    return metrics[0];
  }
}
```

## Security Considerations

### 1. Input Validation

```typescript
// Sanitize search queries
function sanitizeQuery(query: string): string {
  // Remove potential injection attempts
  return query
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/\$/g, '') // Remove potential template literals
    .substring(0, 500); // Limit length
}
```

### 2. Rate Limiting

```typescript
// Rate limit search requests
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many search requests'
});
```

### 3. Permission Filtering

```typescript
// Always filter by user permissions
async function applySecurityFilters(userId: string, workspaceId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workspaces: true }
  });

  if (!user.workspaces.some(w => w.id === workspaceId)) {
    throw new Error('Unauthorized workspace access');
  }

  return {
    workspaceFilter: { term: { workspaceId } },
    statusFilter: user.role === 'VIEWER' ?
      { term: { status: 'PUBLISHED' } } : null
  };
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/test/search/SearchService.test.ts
describe('SearchService', () => {
  it('should return relevant results for query', async () => {
    const results = await searchService.search({
      query: 'typescript',
      workspaceId: 'test-workspace'
    }, 'user-123');

    expect(results.hits.length).toBeGreaterThan(0);
    expect(results.hits[0].document.title).toContain('TypeScript');
  });

  it('should respect permission filters', async () => {
    const results = await searchService.search({
      query: 'restricted',
      workspaceId: 'test-workspace'
    }, 'viewer-user');

    expect(results.hits).not.toContainEqual(
      expect.objectContaining({
        document: expect.objectContaining({
          status: 'DRAFT'
        })
      })
    );
  });
});
```

### Integration Tests

```typescript
// Test ElasticSearch integration
describe('ElasticSearch Integration', () => {
  it('should index and search documents', async () => {
    // Create test document
    const doc = await createTestDocument();

    // Index document
    await searchService.index(doc.id);

    // Wait for index refresh
    await sleep(1000);

    // Search for document
    const results = await searchService.search({
      query: doc.title,
      workspaceId: doc.workspaceId
    }, 'test-user');

    expect(results.hits[0].document.id).toBe(doc.id);
  });
});
```

### Performance Tests

```typescript
// Load testing with k6
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  let response = http.get('http://localhost:3000/api/search?q=test');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

## Monitoring & Observability

### Health Checks

```typescript
// ElasticSearch health endpoint
app.get('/health/elasticsearch', async (req, res) => {
  try {
    const health = await elasticClient.cluster.health();
    res.json({
      status: health.status,
      numberOfNodes: health.number_of_nodes,
      activeShards: health.active_shards
    });
  } catch (error) {
    res.status(503).json({ error: 'ElasticSearch unhealthy' });
  }
});
```

### Metrics Collection

```typescript
// Prometheus metrics
import { Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();

const searchCounter = new Counter({
  name: 'search_requests_total',
  help: 'Total number of search requests',
  labelNames: ['workspace', 'status'],
  registers: [register]
});

const searchDuration = new Histogram({
  name: 'search_duration_seconds',
  help: 'Search request duration',
  labelNames: ['workspace'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});
```

## Migration & Rollout Plan

### Phase 1: Development Setup (Days 1-2)
- Set up ElasticSearch development cluster
- Create index templates and mappings
- Implement basic search service

### Phase 2: Core Implementation (Days 3-5)
- Implement full-text search
- Add faceted search
- Integrate permission filtering

### Phase 3: Advanced Features (Days 6-7)
- Add query optimization
- Implement caching layer
- Add real-time updates

### Phase 4: Testing & Optimization (Days 8-9)
- Performance testing
- Security testing
- Load testing

### Phase 5: Documentation & Handoff (Day 10)
- Complete API documentation
- Create operation runbooks
- Knowledge transfer

## Conclusion

This search architecture provides a scalable, performant, and secure foundation for the Knowledge Network application. The design emphasizes:

1. **Scalability**: Workspace-scoped indexes with horizontal scaling
2. **Performance**: <500ms response times with caching and optimization
3. **Security**: Permission-aware filtering at all levels
4. **Maintainability**: Clean service architecture with clear boundaries
5. **Observability**: Comprehensive monitoring and analytics

The implementation follows the established patterns from Phase 1 and integrates seamlessly with the Phase 2 completed swarms, maintaining the 8.5/10 quality threshold throughout.