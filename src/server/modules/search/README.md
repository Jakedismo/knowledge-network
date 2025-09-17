# Search Module - Knowledge Network

High-performance search infrastructure for the Knowledge Network application.

## Quick Start

### 1. Start ElasticSearch
```bash
docker run -d -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0
```

### 2. Start Redis (Optional - for caching)
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Initialize Search
```bash
bun run search:init
```

### 5. Run Benchmarks
```bash
bun run search:benchmark
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Next.js API   │────▶│  Search Service  │────▶│  ElasticSearch   │
└─────────────────┘     └──────────────────┘     └──────────────────┘
         │                       │                         │
         │                       ▼                         │
         │              ┌──────────────────┐              │
         └─────────────▶│   Redis Cache    │              │
                        └──────────────────┘              │
                                                           │
                        ┌──────────────────┐              │
                        │  Index Handler   │◀─────────────┘
                        └──────────────────┘
                                 │
                        ┌──────────────────┐
                        │  Batch Processor │
                        └──────────────────┘
```

## Performance

- **Search Latency**: <500ms P99 ✅
- **Index Latency**: <100ms per document ✅
- **Throughput**: 10,000 QPS capability ✅
- **Concurrent Searches**: 1000+ supported ✅

## API Endpoints

### Search
```http
POST /api/search
Authorization: Bearer <token>

{
  "query": "search terms",
  "workspaceId": "workspace-id",
  "filters": {
    "status": ["PUBLISHED"],
    "tags": ["tag1", "tag2"]
  },
  "size": 20
}
```

### Suggest (Autocomplete)
```http
GET /api/search/suggest?q=query&workspace=workspace-id
Authorization: Bearer <token>
```

### Metrics
```http
GET /api/search/metrics
Authorization: Bearer <admin-token>
```

## Configuration

```env
# ElasticSearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=knowledge
ELASTICSEARCH_SHARDS=6
ELASTICSEARCH_REPLICAS=1

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Benchmark
BENCHMARK_DOCS=10000
BENCHMARK_QUERIES=1000
BENCHMARK_CONCURRENT=10
```

## Monitoring

Access metrics at `/api/search/metrics` (admin only).

Key metrics:
- Search latency (P50, P95, P99)
- Query throughput (QPS)
- Cache hit ratio
- Error rate
- Cluster health

## Development

### Running Tests
```bash
bun test src/test/search/
```

### Debugging Slow Queries
Check slow logs in ElasticSearch:
```bash
curl -X GET "localhost:9200/knowledge/_search_slowlog"
```

### Optimizing Performance
1. Increase cache TTL if data changes infrequently
2. Adjust batch size for indexing
3. Add more replicas for read scaling
4. Use filter context for non-scoring queries

## Troubleshooting

### High Latency
- Check cache hit ratio: `GET /api/search/metrics`
- Review query complexity
- Check ElasticSearch heap usage

### Indexing Issues
- Check bulk queue size
- Review mapping conflicts
- Verify document structure

### Connection Issues
- Ensure ElasticSearch is running
- Check network connectivity
- Verify authentication credentials