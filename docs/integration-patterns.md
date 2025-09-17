# Integration Patterns - Knowledge Network

## Overview

This document outlines the integration patterns and strategies for connecting ElasticSearch, Redis, and PostgreSQL in the Knowledge Network application, ensuring optimal performance, data consistency, and scalability.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│                   (GraphQL/REST APIs)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                Data Access Layer                                │
│              (Repository Pattern)                               │
└─────┬───────────────┬───────────────────┬─────────────────────────┘
      │               │                   │
┌─────▼──┐      ┌─────▼──┐          ┌─────▼──┐
│PostgreSQL│    │  Redis │          │ElasticSearch│
│(Primary) │    │(Cache) │          │  (Search)   │
└─────────┘    └────────┘          └─────────────┘
```

## PostgreSQL Integration Patterns

### 1. Repository Pattern Implementation

```typescript
// Base Repository Interface
export interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findMany(criteria: FindManyOptions<T>): Promise<T[]>;
  create(data: CreateData<T>): Promise<T>;
  update(id: ID, data: UpdateData<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  count(criteria?: CountOptions<T>): Promise<number>;
}

// Knowledge Repository Implementation
@Injectable()
export class KnowledgeRepository implements IRepository<Knowledge, string> {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private searchService: SearchService
  ) {}

  async findById(id: string): Promise<Knowledge | null> {
    // Try cache first
    const cached = await this.cacheService.get(`knowledge:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const knowledge = await this.prisma.knowledge.findUnique({
      where: { id },
      include: {
        author: true,
        tags: { include: { tag: true } },
        collection: true,
        workspace: true
      }
    });

    if (knowledge) {
      // Cache for 1 hour
      await this.cacheService.set(`knowledge:${id}`, JSON.stringify(knowledge), 3600);
    }

    return knowledge;
  }

  async create(data: CreateKnowledgeData): Promise<Knowledge> {
    // Start transaction
    return this.prisma.$transaction(async (prisma) => {
      // Create knowledge record
      const knowledge = await prisma.knowledge.create({
        data: {
          ...data,
          version: 1,
          status: KnowledgeStatus.DRAFT
        },
        include: {
          author: true,
          tags: { include: { tag: true } },
          collection: true,
          workspace: true
        }
      });

      // Create initial version
      await prisma.knowledgeVersion.create({
        data: {
          knowledgeId: knowledge.id,
          versionNumber: 1,
          content: knowledge.content,
          contentDelta: knowledge.contentDelta,
          authorId: knowledge.authorId,
          changeSummary: 'Initial version'
        }
      });

      // Update cache
      await this.cacheService.set(`knowledge:${knowledge.id}`, JSON.stringify(knowledge), 3600);

      // Index in ElasticSearch (async)
      this.searchService.indexKnowledge(knowledge).catch(console.error);

      return knowledge;
    });
  }

  async update(id: string, data: UpdateKnowledgeData): Promise<Knowledge> {
    return this.prisma.$transaction(async (prisma) => {
      // Get current version
      const current = await prisma.knowledge.findUnique({ where: { id } });
      if (!current) {
        throw new NotFoundException('Knowledge not found');
      }

      // Update knowledge
      const updated = await prisma.knowledge.update({
        where: { id },
        data: {
          ...data,
          version: current.version + 1,
          updatedAt: new Date()
        },
        include: {
          author: true,
          tags: { include: { tag: true } },
          collection: true,
          workspace: true
        }
      });

      // Create version snapshot
      await prisma.knowledgeVersion.create({
        data: {
          knowledgeId: id,
          versionNumber: updated.version,
          content: updated.content,
          contentDelta: updated.contentDelta,
          authorId: data.authorId || current.authorId,
          changeSummary: data.changeSummary || 'Updated content'
        }
      });

      // Update cache
      await this.cacheService.set(`knowledge:${id}`, JSON.stringify(updated), 3600);

      // Update search index (async)
      this.searchService.updateIndex(updated).catch(console.error);

      return updated;
    });
  }

  async findByWorkspace(
    workspaceId: string,
    options: FindManyOptions<Knowledge>
  ): Promise<Knowledge[]> {
    const cacheKey = `workspace:${workspaceId}:knowledge:${this.hashOptions(options)}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const knowledge = await this.prisma.knowledge.findMany({
      where: {
        workspaceId,
        ...options.where
      },
      include: {
        author: true,
        tags: { include: { tag: true } },
        collection: true
      },
      orderBy: options.orderBy || { updatedAt: 'desc' },
      take: options.take || 20,
      skip: options.skip || 0
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(knowledge), 300);

    return knowledge;
  }
}
```

### 2. Connection Pool Configuration

```typescript
// Database Configuration
export class DatabaseConfig {
  static getConfig(): PrismaClientOptions {
    return {
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ]
    };
  }

  static setupLogging(prisma: PrismaClient): void {
    prisma.$on('query', (e) => {
      console.log('Query: ' + e.query);
      console.log('Duration: ' + e.duration + 'ms');
    });

    prisma.$on('error', (e) => {
      console.error('Database error:', e);
    });
  }
}

// Connection Pool Settings (environment variables)
/*
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&connection_limit=20&pool_timeout=20&connect_timeout=10"

Connection Pool Settings:
- connection_limit: 20 (max connections per service instance)
- pool_timeout: 20s (timeout waiting for connection)
- connect_timeout: 10s (timeout establishing connection)
*/
```

### 3. Migration and Schema Management

```typescript
// Migration Service
@Injectable()
export class MigrationService {
  constructor(private prisma: PrismaService) {}

  async runMigrations(): Promise<void> {
    try {
      await this.prisma.$executeRaw`SELECT 1`; // Test connection
      console.log('Database connection successful');

      // Run Prisma migrations
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });

      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async seedDatabase(): Promise<void> {
    // Create default roles
    await this.createDefaultRoles();

    // Create system workspace
    await this.createSystemWorkspace();

    // Create admin user
    await this.createAdminUser();
  }

  private async createDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: 'admin',
        permissions: ['*'],
        isSystemRole: true
      },
      {
        name: 'editor',
        permissions: ['knowledge:read', 'knowledge:write', 'knowledge:comment'],
        isSystemRole: true
      },
      {
        name: 'viewer',
        permissions: ['knowledge:read'],
        isSystemRole: true
      }
    ];

    for (const role of defaultRoles) {
      await this.prisma.role.upsert({
        where: { name_workspaceId: { name: role.name, workspaceId: 'system' } },
        update: {},
        create: {
          ...role,
          workspaceId: 'system'
        }
      });
    }
  }
}
```

## Redis Integration Patterns

### 1. Caching Strategy

```typescript
// Cache Service Implementation
@Injectable()
export class CacheService {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3
    });
  }

  // Basic caching operations
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null; // Graceful degradation
    }
  }

  async set(key: string, value: string, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, value);
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - caching is not critical
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Pattern-based operations
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Knowledge-specific caching
  async cacheKnowledge(knowledge: Knowledge): Promise<void> {
    const key = `knowledge:${knowledge.id}`;
    await this.set(key, JSON.stringify(knowledge), 3600);

    // Also cache by workspace
    const workspaceKey = `workspace:${knowledge.workspaceId}:knowledge:latest`;
    const latestKnowledge = await this.get(workspaceKey);
    const latest = latestKnowledge ? JSON.parse(latestKnowledge) : [];

    latest.unshift(knowledge);
    if (latest.length > 20) latest.splice(20); // Keep only latest 20

    await this.set(workspaceKey, JSON.stringify(latest), 1800); // 30 minutes
  }

  async invalidateKnowledge(knowledgeId: string, workspaceId?: string): Promise<void> {
    await this.del(`knowledge:${knowledgeId}`);

    if (workspaceId) {
      await this.invalidatePattern(`workspace:${workspaceId}:*`);
    }
  }

  // Search result caching
  async cacheSearchResults(queryHash: string, results: any, ttl: number = 300): Promise<void> {
    const key = `search:${queryHash}`;
    await this.set(key, JSON.stringify(results), ttl);
  }

  async getCachedSearchResults(queryHash: string): Promise<any | null> {
    const cached = await this.get(`search:${queryHash}`);
    return cached ? JSON.parse(cached) : null;
  }
}
```

### 2. Session Management

```typescript
// Session Service
@Injectable()
export class SessionService {
  constructor(private redis: Redis) {}

  async createSession(userId: string, userData: UserSession): Promise<string> {
    const sessionId = generateSecureId();
    const sessionKey = `session:${sessionId}`;

    const sessionData = {
      userId,
      ...userData,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    await this.redis.setex(sessionKey, 86400, JSON.stringify(sessionData)); // 24 hours

    // Track user sessions
    await this.redis.sadd(`user_sessions:${userId}`, sessionId);

    return sessionId;
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);

    // Update last accessed
    session.lastAccessed = new Date();
    await this.redis.setex(sessionKey, 86400, JSON.stringify(session));

    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (sessionData) {
      const session = JSON.parse(sessionData);
      await this.redis.srem(`user_sessions:${session.userId}`, sessionId);
    }

    await this.redis.del(sessionKey);
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = `user_sessions:${userId}`;
    const sessionIds = await this.redis.smembers(userSessionsKey);

    if (sessionIds.length > 0) {
      const sessionKeys = sessionIds.map(id => `session:${id}`);
      await this.redis.del(...sessionKeys);
      await this.redis.del(userSessionsKey);
    }
  }
}
```

### 3. Real-time Presence Management

```typescript
// Presence Service
@Injectable()
export class PresenceService {
  constructor(private redis: Redis) {}

  async addUser(documentId: string, userId: string, socketId: string): Promise<void> {
    const presenceKey = `presence:${documentId}`;
    const userKey = `user:${userId}`;

    const userData = {
      userId,
      socketId,
      joinedAt: new Date(),
      lastSeen: new Date()
    };

    // Add to document presence set
    await this.redis.hset(presenceKey, userId, JSON.stringify(userData));

    // Set expiration for cleanup
    await this.redis.expire(presenceKey, 3600); // 1 hour

    // Track user's active documents
    await this.redis.sadd(`${userKey}:documents`, documentId);
    await this.redis.expire(`${userKey}:documents`, 3600);
  }

  async removeUser(documentId: string, userId: string): Promise<void> {
    const presenceKey = `presence:${documentId}`;
    const userKey = `user:${userId}`;

    await this.redis.hdel(presenceKey, userId);
    await this.redis.srem(`${userKey}:documents`, documentId);
  }

  async getActiveUsers(documentId: string): Promise<PresenceUser[]> {
    const presenceKey = `presence:${documentId}`;
    const users = await this.redis.hgetall(presenceKey);

    return Object.values(users).map(userData => JSON.parse(userData));
  }

  async updateUserActivity(documentId: string, userId: string, activity: UserActivity): Promise<void> {
    const presenceKey = `presence:${documentId}`;
    const userData = await this.redis.hget(presenceKey, userId);

    if (userData) {
      const user = JSON.parse(userData);
      user.lastSeen = new Date();
      user.activity = activity;

      await this.redis.hset(presenceKey, userId, JSON.stringify(user));
    }
  }

  // Cleanup inactive users
  async cleanupInactiveUsers(): Promise<void> {
    const pattern = 'presence:*';
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const users = await this.redis.hgetall(key);
      const now = new Date();

      for (const [userId, userData] of Object.entries(users)) {
        const user = JSON.parse(userData);
        const lastSeen = new Date(user.lastSeen);
        const inactiveMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

        if (inactiveMinutes > 30) { // Remove users inactive for 30+ minutes
          await this.redis.hdel(key, userId);
        }
      }
    }
  }
}
```

## ElasticSearch Integration Patterns

### 1. Search Service Implementation

```typescript
// ElasticSearch Service
@Injectable()
export class ElasticSearchService {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      },
      requestTimeout: 30000,
      pingTimeout: 3000,
      sniffOnStart: true
    });
  }

  async initializeIndices(): Promise<void> {
    await this.createKnowledgeIndex();
    await this.createAnalyticsIndex();
  }

  private async createKnowledgeIndex(): Promise<void> {
    const indexName = 'knowledge';

    const exists = await this.client.indices.exists({ index: indexName });
    if (exists.body) return;

    await this.client.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: 3,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              content_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'stemmer']
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'content_analyzer',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            content: {
              type: 'text',
              analyzer: 'content_analyzer'
            },
            excerpt: {
              type: 'text',
              analyzer: 'content_analyzer'
            },
            tags: {
              type: 'keyword',
              fields: {
                suggest: { type: 'completion' }
              }
            },
            workspace_id: { type: 'keyword' },
            author_id: { type: 'keyword' },
            status: { type: 'keyword' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
            content_embedding: {
              type: 'dense_vector',
              dims: 1536 // OpenAI embedding dimension
            }
          }
        }
      }
    });
  }

  async indexKnowledge(knowledge: Knowledge): Promise<void> {
    const document = {
      id: knowledge.id,
      title: knowledge.title,
      content: knowledge.content,
      excerpt: knowledge.excerpt,
      tags: knowledge.tags?.map(tag => tag.name) || [],
      workspace_id: knowledge.workspaceId,
      author_id: knowledge.authorId,
      status: knowledge.status,
      created_at: knowledge.createdAt,
      updated_at: knowledge.updatedAt
    };

    // Generate embeddings if AI service is available
    try {
      const embedding = await this.generateEmbedding(knowledge.content);
      document.content_embedding = embedding;
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
    }

    await this.client.index({
      index: 'knowledge',
      id: knowledge.id,
      body: document,
      refresh: 'wait_for'
    });
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const { query, filters, workspaceId, pagination, sortBy } = params;

    // Build query
    const searchQuery = this.buildSearchQuery(query, filters, workspaceId);

    // Execute search
    const response = await this.client.search({
      index: 'knowledge',
      body: {
        query: searchQuery,
        highlight: {
          fields: {
            title: {},
            content: {
              fragment_size: 150,
              number_of_fragments: 3,
              pre_tags: ['<mark>'],
              post_tags: ['</mark>']
            }
          }
        },
        aggs: this.buildAggregations(),
        from: pagination.offset || 0,
        size: pagination.limit || 20,
        sort: this.buildSort(sortBy)
      }
    });

    return this.transformResponse(response);
  }

  private buildSearchQuery(query: string, filters: SearchFilters, workspaceId: string): any {
    const mustClauses = [];
    const filterClauses = [
      { term: { workspace_id: workspaceId } }
    ];

    // Text search
    if (query) {
      mustClauses.push({
        bool: {
          should: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'content', 'excerpt^2'],
                type: 'best_fields',
                fuzziness: 'AUTO',
                prefix_length: 2,
                boost: 2.0
              }
            },
            {
              wildcard: {
                title: `*${query.toLowerCase()}*`
              }
            }
          ],
          minimum_should_match: 1
        }
      });
    }

    // Semantic search using embeddings
    if (query && process.env.ENABLE_SEMANTIC_SEARCH === 'true') {
      mustClauses.push({
        script_score: {
          query: { match_all: {} },
          script: {
            source: `
              if (doc['content_embedding'].size() == 0) {
                return 0;
              }
              return cosineSimilarity(params.query_vector, 'content_embedding') + 1.0
            `,
            params: {
              query_vector: [] // Would be populated with actual embedding
            }
          },
          boost: 1.0
        }
      });
    }

    // Apply filters
    if (filters.tags?.length) {
      filterClauses.push({
        terms: { tags: filters.tags }
      });
    }

    if (filters.authors?.length) {
      filterClauses.push({
        terms: { author_id: filters.authors }
      });
    }

    if (filters.status?.length) {
      filterClauses.push({
        terms: { status: filters.status }
      });
    }

    if (filters.dateRange) {
      filterClauses.push({
        range: {
          updated_at: {
            gte: filters.dateRange.from,
            lte: filters.dateRange.to
          }
        }
      });
    }

    return {
      bool: {
        must: mustClauses.length ? mustClauses : [{ match_all: {} }],
        filter: filterClauses
      }
    };
  }

  private buildAggregations(): any {
    return {
      tags: {
        terms: {
          field: 'tags',
          size: 20,
          order: { _count: 'desc' }
        }
      },
      authors: {
        terms: {
          field: 'author_id',
          size: 10
        }
      },
      status: {
        terms: {
          field: 'status'
        }
      },
      creation_timeline: {
        date_histogram: {
          field: 'created_at',
          calendar_interval: 'month'
        }
      }
    };
  }

  async suggest(query: string, workspaceId: string): Promise<Suggestion[]> {
    const response = await this.client.search({
      index: 'knowledge',
      body: {
        suggest: {
          title_suggestions: {
            prefix: query,
            completion: {
              field: 'title.suggest',
              size: 5
            }
          },
          tag_suggestions: {
            prefix: query,
            completion: {
              field: 'tags.suggest',
              size: 5
            }
          }
        },
        query: {
          bool: {
            filter: [
              { term: { workspace_id: workspaceId } }
            ]
          }
        }
      }
    });

    return this.transformSuggestions(response);
  }

  async updateIndex(knowledge: Knowledge): Promise<void> {
    await this.indexKnowledge(knowledge); // Upsert operation
  }

  async deleteFromIndex(knowledgeId: string): Promise<void> {
    try {
      await this.client.delete({
        index: 'knowledge',
        id: knowledgeId,
        refresh: 'wait_for'
      });
    } catch (error) {
      if (error.meta?.statusCode !== 404) {
        throw error;
      }
    }
  }

  async reindexWorkspace(workspaceId: string): Promise<void> {
    // Delete existing documents
    await this.client.deleteByQuery({
      index: 'knowledge',
      body: {
        query: {
          term: { workspace_id: workspaceId }
        }
      },
      refresh: true
    });

    // Re-index all knowledge in workspace
    const knowledge = await this.knowledgeRepository.findByWorkspace(workspaceId);

    const bulkBody = [];
    for (const item of knowledge) {
      bulkBody.push(
        { index: { _index: 'knowledge', _id: item.id } },
        await this.transformForIndex(item)
      );
    }

    if (bulkBody.length > 0) {
      await this.client.bulk({
        body: bulkBody,
        refresh: 'wait_for'
      });
    }
  }
}
```

### 2. Search Analytics

```typescript
// Search Analytics Service
@Injectable()
export class SearchAnalyticsService {
  constructor(
    private elasticsearch: ElasticSearchService,
    private redis: Redis
  ) {}

  async trackSearchQuery(searchParams: SearchAnalyticsParams): Promise<void> {
    const analyticsDoc = {
      query: searchParams.query,
      filters: searchParams.filters,
      workspace_id: searchParams.workspaceId,
      user_id: searchParams.userId,
      result_count: searchParams.resultCount,
      response_time: searchParams.responseTime,
      clicked_results: searchParams.clickedResults || [],
      timestamp: new Date()
    };

    await this.elasticsearch.client.index({
      index: 'search_analytics',
      body: analyticsDoc
    });

    // Update real-time metrics in Redis
    await this.updateRealTimeMetrics(searchParams);
  }

  private async updateRealTimeMetrics(params: SearchAnalyticsParams): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Increment daily search count
    await this.redis.incr(`search_count:${today}`);

    // Track popular queries
    await this.redis.zincrby(`popular_queries:${today}`, 1, params.query);

    // Track zero result queries
    if (params.resultCount === 0) {
      await this.redis.zincrby(`zero_results:${today}`, 1, params.query);
    }
  }

  async getSearchTrends(workspaceId: string, timeRange: TimeRange): Promise<SearchTrends> {
    const response = await this.elasticsearch.client.search({
      index: 'search_analytics',
      body: {
        query: {
          bool: {
            filter: [
              { term: { workspace_id: workspaceId } },
              {
                range: {
                  timestamp: {
                    gte: timeRange.from,
                    lte: timeRange.to
                  }
                }
              }
            ]
          }
        },
        aggs: {
          popular_queries: {
            terms: {
              field: 'query.keyword',
              size: 10,
              order: { _count: 'desc' }
            }
          },
          zero_result_queries: {
            filter: {
              term: { result_count: 0 }
            },
            aggs: {
              queries: {
                terms: {
                  field: 'query.keyword',
                  size: 10
                }
              }
            }
          },
          search_volume: {
            date_histogram: {
              field: 'timestamp',
              calendar_interval: 'day'
            }
          }
        },
        size: 0
      }
    });

    return this.transformSearchTrends(response);
  }
}
```

## Data Consistency Patterns

### 1. Event-Driven Consistency

```typescript
// Event-Driven Data Synchronization
@Injectable()
export class DataSyncService {
  constructor(
    private eventBus: EventBus,
    private cacheService: CacheService,
    private searchService: ElasticSearchService
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Knowledge events
    this.eventBus.on('knowledge.created', this.handleKnowledgeCreated.bind(this));
    this.eventBus.on('knowledge.updated', this.handleKnowledgeUpdated.bind(this));
    this.eventBus.on('knowledge.deleted', this.handleKnowledgeDeleted.bind(this));

    // Tag events
    this.eventBus.on('tag.created', this.handleTagCreated.bind(this));
    this.eventBus.on('tag.updated', this.handleTagUpdated.bind(this));
  }

  private async handleKnowledgeCreated(event: KnowledgeCreatedEvent): Promise<void> {
    const { knowledge } = event;

    // Update search index
    await this.searchService.indexKnowledge(knowledge);

    // Update cache
    await this.cacheService.cacheKnowledge(knowledge);

    // Invalidate related caches
    await this.cacheService.invalidatePattern(`workspace:${knowledge.workspaceId}:*`);
  }

  private async handleKnowledgeUpdated(event: KnowledgeUpdatedEvent): Promise<void> {
    const { knowledge, previousVersion } = event;

    // Update search index
    await this.searchService.updateIndex(knowledge);

    // Update cache
    await this.cacheService.cacheKnowledge(knowledge);

    // Invalidate related caches
    await this.cacheService.invalidateKnowledge(knowledge.id, knowledge.workspaceId);
  }

  private async handleKnowledgeDeleted(event: KnowledgeDeletedEvent): Promise<void> {
    const { knowledgeId, workspaceId } = event;

    // Remove from search index
    await this.searchService.deleteFromIndex(knowledgeId);

    // Remove from cache
    await this.cacheService.del(`knowledge:${knowledgeId}`);

    // Invalidate related caches
    await this.cacheService.invalidatePattern(`workspace:${workspaceId}:*`);
  }
}
```

### 2. Distributed Locking

```typescript
// Distributed Lock Service
@Injectable()
export class DistributedLockService {
  constructor(private redis: Redis) {}

  async acquireLock(
    resource: string,
    ttl: number = 30000, // 30 seconds
    retryDelay: number = 100
  ): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = generateUniqueId();
    const maxRetries = Math.floor(ttl / retryDelay);

    for (let i = 0; i < maxRetries; i++) {
      const result = await this.redis.set(lockKey, lockValue, 'PX', ttl, 'NX');

      if (result === 'OK') {
        return lockValue;
      }

      await this.delay(retryDelay);
    }

    return null; // Failed to acquire lock
  }

  async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }

  async withLock<T>(
    resource: string,
    operation: () => Promise<T>,
    ttl: number = 30000
  ): Promise<T> {
    const lockValue = await this.acquireLock(resource, ttl);

    if (!lockValue) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(resource, lockValue);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Performance Optimization Patterns

### 1. Query Optimization

```typescript
// Database Query Optimizer
@Injectable()
export class QueryOptimizer {
  private queryCache = new Map<string, string>();

  // Optimized pagination for large datasets
  async paginateWithCursor<T>(
    query: (cursor?: string, limit?: number) => Promise<{ items: T[]; nextCursor?: string }>,
    limit: number = 20
  ): Promise<PaginatedResult<T>> {
    const result = await query(undefined, limit + 1); // Fetch one extra to check if there's more

    const hasNextPage = result.items.length > limit;
    const items = hasNextPage ? result.items.slice(0, limit) : result.items;
    const nextCursor = hasNextPage ? this.generateCursor(items[items.length - 1]) : undefined;

    return {
      items,
      hasNextPage,
      nextCursor
    };
  }

  // Batch loading to prevent N+1 queries
  async batchLoadTags(knowledgeIds: string[]): Promise<Map<string, Tag[]>> {
    const knowledgeTags = await this.prisma.knowledgeTag.findMany({
      where: {
        knowledgeId: { in: knowledgeIds }
      },
      include: {
        tag: true
      }
    });

    const tagMap = new Map<string, Tag[]>();

    for (const kt of knowledgeTags) {
      if (!tagMap.has(kt.knowledgeId)) {
        tagMap.set(kt.knowledgeId, []);
      }
      tagMap.get(kt.knowledgeId)!.push(kt.tag);
    }

    return tagMap;
  }

  // Prepared statement optimization
  getPreparedQuery(queryId: string): string {
    if (!this.queryCache.has(queryId)) {
      const query = this.buildOptimizedQuery(queryId);
      this.queryCache.set(queryId, query);
    }
    return this.queryCache.get(queryId)!;
  }
}
```

### 2. Cache Warming and Preloading

```typescript
// Cache Warming Service
@Injectable()
export class CacheWarmingService {
  constructor(
    private cacheService: CacheService,
    private knowledgeRepository: KnowledgeRepository,
    private searchService: ElasticSearchService
  ) {}

  async warmWorkspaceCache(workspaceId: string): Promise<void> {
    // Preload recent knowledge
    const recentKnowledge = await this.knowledgeRepository.findByWorkspace(
      workspaceId,
      { orderBy: { updatedAt: 'desc' }, take: 50 }
    );

    for (const knowledge of recentKnowledge) {
      await this.cacheService.cacheKnowledge(knowledge);
    }

    // Preload popular tags
    const popularTags = await this.tagRepository.findPopularByWorkspace(workspaceId, 20);
    await this.cacheService.set(
      `workspace:${workspaceId}:popular_tags`,
      JSON.stringify(popularTags),
      3600
    );

    // Preload workspace metadata
    const workspace = await this.workspaceRepository.findById(workspaceId);
    await this.cacheService.set(
      `workspace:${workspaceId}:metadata`,
      JSON.stringify(workspace),
      3600
    );
  }

  async scheduleRegularWarming(): Promise<void> {
    // Schedule cache warming for active workspaces
    const activeWorkspaces = await this.getActiveWorkspaces();

    for (const workspace of activeWorkspaces) {
      // Schedule warming during off-peak hours
      this.scheduleTask('warmWorkspaceCache', workspace.id, {
        cron: '0 2 * * *', // 2 AM daily
        data: { workspaceId: workspace.id }
      });
    }
  }
}
```

This comprehensive integration pattern ensures optimal performance, data consistency, and scalability across all three data stores while maintaining clean separation of concerns and robust error handling.