import { Client } from '@elastic/elasticsearch'
import type { ClientOptions } from '@elastic/elasticsearch'

// High-performance ElasticSearch client configuration
// Optimized for <500ms search latency and high throughput
export function createElasticClient(): Client {
  const config: ClientOptions = {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    maxRetries: 3,
    requestTimeout: 30000,
    sniffOnStart: true,
    sniffInterval: 60000,
    sniffOnConnectionFault: true,
    resurrectStrategy: 'ping',
    compression: 'gzip',
    // Connection pooling for optimal performance
    maxConnections: 100,
    // Keep-alive for connection reuse
    agent: {
      keepAlive: true,
      keepAliveMsecs: 60000,
      maxSockets: 100,
      maxFreeSockets: 10
    }
  }

  // Add authentication if configured
  if (process.env.ELASTICSEARCH_API_KEY) {
    config.auth = {
      apiKey: process.env.ELASTICSEARCH_API_KEY
    }
  } else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
    config.auth = {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
    }
  }

  return new Client(config)
}

// Singleton instance for connection reuse
let elasticClient: Client | null = null

export function getElasticClient(): Client {
  if (!elasticClient) {
    elasticClient = createElasticClient()
  }
  return elasticClient
}

// Index configuration optimized for performance
export const KNOWLEDGE_INDEX_CONFIG = {
  index: process.env.ELASTICSEARCH_INDEX || 'knowledge',
  settings: {
    number_of_shards: parseInt(process.env.ELASTICSEARCH_SHARDS || '6'),
    number_of_replicas: parseInt(process.env.ELASTICSEARCH_REPLICAS || '1'),
    refresh_interval: '1s',
    'index.search.slowlog.threshold.query.warn': '10s',
    'index.search.slowlog.threshold.fetch.warn': '1s',
    'index.indexing.slowlog.threshold.index.warn': '10s',
    'index.max_result_window': 10000,
    // Optimize for search performance
    'index.queries.cache.enabled': true,
    'index.requests.cache.enable': true,
    'indices.queries.cache.size': '20%',
    'indices.fielddata.cache.size': '40%'
  }
}

// Mapping optimized for search performance
export const KNOWLEDGE_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    workspaceId: { type: 'keyword' },
    title: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword', ignore_above: 256 },
        suggest: { type: 'completion' }
      }
    },
    contentText: {
      type: 'text',
      analyzer: 'standard',
      index_options: 'offsets',
      term_vector: 'with_positions_offsets'
    },
    excerpt: {
      type: 'text',
      analyzer: 'standard'
    },
    status: { type: 'keyword' },
    author: {
      properties: {
        id: { type: 'keyword' },
        displayName: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 256 }
          }
        }
      }
    },
    collection: {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 256 }
          }
        }
      }
    },
    collectionPath: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' }
      }
    },
    tags: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        color: { type: 'keyword' }
      }
    },
    metadata: {
      type: 'object',
      enabled: false // Store but don't index
    },
    facets: {
      type: 'nested',
      properties: {
        keyPath: { type: 'keyword' },
        type: { type: 'keyword' },
        stringVal: { type: 'keyword' },
        numberVal: { type: 'double' },
        dateVal: { type: 'date' },
        boolVal: { type: 'boolean' }
      }
    },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    // For autocomplete
    suggest: {
      type: 'completion',
      analyzer: 'simple',
      preserve_separators: false,
      preserve_position_increments: true,
      max_input_length: 50
    }
  }
}

// Health check for cluster
export async function checkElasticHealth(): Promise<boolean> {
  try {
    const client = getElasticClient()
    const health = await client.cluster.health()
    return health.status !== 'red'
  } catch (error) {
    console.error('ElasticSearch health check failed:', error)
    return false
  }
}

// Initialize index with optimal settings
export async function initializeIndex(): Promise<void> {
  const client = getElasticClient()

  try {
    const indexExists = await client.indices.exists({
      index: KNOWLEDGE_INDEX_CONFIG.index
    })

    if (!indexExists) {
      await client.indices.create({
        index: KNOWLEDGE_INDEX_CONFIG.index,
        body: {
          settings: KNOWLEDGE_INDEX_CONFIG.settings,
          mappings: KNOWLEDGE_INDEX_MAPPING
        }
      })
      console.log(`Created index: ${KNOWLEDGE_INDEX_CONFIG.index}`)
    }
  } catch (error) {
    console.error('Failed to initialize index:', error)
    throw error
  }
}