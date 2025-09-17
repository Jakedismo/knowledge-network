#!/bin/bash

# Knowledge Network - ElasticSearch Setup Script
set -e

echo "🔍 Setting up ElasticSearch for Knowledge Network..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p docker/config
mkdir -p docker/data/elasticsearch
mkdir -p docker/data/redis

# Start ElasticSearch cluster
echo "🚀 Starting ElasticSearch cluster..."
cd docker
docker-compose -f elasticsearch-compose.yml up -d

# Wait for ElasticSearch to be ready
echo "⏳ Waiting for ElasticSearch to be ready..."
until curl -s http://localhost:9200/_cluster/health > /dev/null; do
    echo -n "."
    sleep 5
done
echo ""
echo -e "${GREEN}✅ ElasticSearch is ready!${NC}"

# Create index template
echo "📝 Creating index template..."
curl -X PUT "localhost:9200/_index_template/knowledge-template" \
  -H 'Content-Type: application/json' \
  -d @- <<'EOF'
{
  "index_patterns": ["knowledge-*"],
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index": {
        "refresh_interval": "1s",
        "max_result_window": 10000
      }
    },
    "mappings": {
      "properties": {
        "id": {"type": "keyword"},
        "workspaceId": {"type": "keyword"},
        "title": {
          "type": "text",
          "analyzer": "standard",
          "boost": 3,
          "fields": {
            "keyword": {"type": "keyword"},
            "suggest": {"type": "completion"}
          }
        },
        "content": {
          "type": "text",
          "analyzer": "standard"
        },
        "excerpt": {
          "type": "text",
          "boost": 2
        },
        "status": {"type": "keyword"},
        "author": {
          "type": "object",
          "properties": {
            "id": {"type": "keyword"},
            "displayName": {
              "type": "text",
              "fields": {"keyword": {"type": "keyword"}}
            }
          }
        },
        "collection": {
          "type": "object",
          "properties": {
            "id": {"type": "keyword"},
            "name": {
              "type": "text",
              "fields": {"keyword": {"type": "keyword"}}
            }
          }
        },
        "tags": {
          "type": "nested",
          "properties": {
            "id": {"type": "keyword"},
            "name": {"type": "keyword"},
            "color": {"type": "keyword"}
          }
        },
        "createdAt": {"type": "date"},
        "updatedAt": {"type": "date"}
      }
    }
  }
}
EOF

echo -e "${GREEN}✅ Index template created!${NC}"

# Create a test index
echo "🧪 Creating test index..."
curl -X PUT "localhost:9200/knowledge-test" > /dev/null 2>&1

# Check cluster health
echo "📊 Cluster health:"
curl -s "localhost:9200/_cluster/health?pretty"

echo ""
echo -e "${GREEN}✨ ElasticSearch setup complete!${NC}"
echo ""
echo "📌 Services running at:"
echo "  - ElasticSearch: http://localhost:9200"
echo "  - Kibana: http://localhost:5601"
echo "  - Redis: redis://localhost:6379"
echo ""
echo "💡 To stop the services, run:"
echo "  cd docker && docker-compose -f elasticsearch-compose.yml down"
echo ""
echo "📚 To view logs, run:"
echo "  cd docker && docker-compose -f elasticsearch-compose.yml logs -f"