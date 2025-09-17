# Microservices Architecture - Knowledge Network

## Overview

The Knowledge Network backend is designed as a set of loosely coupled, independently deployable microservices. Each service has a specific business responsibility and communicates through well-defined APIs.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                              │
│                     (GraphQL Federation)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
    ┌─────▼──┐   ┌────▼───┐   ┌───▼────┐
    │Auth Svc│   │Content │   │Search  │
    │        │   │Service │   │Service │
    └─────┬──┘   └────┬───┘   └───┬────┘
          │           │           │
    ┌─────▼──┐   ┌────▼───┐   ┌───▼────┐
    │Collab  │   │AI Svc  │   │Analytics│
    │Service │   │        │   │Service │
    └────────┘   └────────┘   └────────┘
```

## Core Services

### 1. API Gateway Service

**Responsibility**: Request routing, authentication, rate limiting, and GraphQL federation.

```typescript
// API Gateway Configuration
export class APIGatewayService {
  private federation: ApolloGateway;
  private rateLimiter: RateLimiterRedis;

  constructor() {
    this.federation = new ApolloGateway({
      serviceList: [
        { name: 'auth', url: 'http://auth-service:4001/graphql' },
        { name: 'content', url: 'http://content-service:4002/graphql' },
        { name: 'search', url: 'http://search-service:4003/graphql' },
        { name: 'collaboration', url: 'http://collaboration-service:4004/graphql' },
        { name: 'ai', url: 'http://ai-service:4005/graphql' },
        { name: 'analytics', url: 'http://analytics-service:4006/graphql' }
      ]
    });

    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyGenerator: 'ip',
      points: 100, // Requests
      duration: 60, // Per 60 seconds
    });
  }

  async setup(): Promise<ApolloServer> {
    const server = new ApolloServer({
      gateway: this.federation,
      context: ({ req }) => this.buildContext(req),
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        ApolloServerPluginLandingPageGraphQLPlayground({})
      ]
    });

    return server;
  }

  private async buildContext({ req }: { req: Request }): Promise<GraphQLContext> {
    // Rate limiting
    await this.rateLimiter.consume(req.ip);

    // Authentication
    const token = this.extractToken(req);
    const user = token ? await this.verifyToken(token) : null;

    return {
      user,
      req,
      dataSources: this.createDataSources()
    };
  }
}
```

**Docker Configuration**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 4000
CMD ["node", "dist/gateway.js"]
```

### 2. Authentication Service

**Responsibility**: User authentication, authorization, JWT management, and RBAC.

```typescript
// Authentication Service
@Service()
export class AuthenticationService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JWTService,
    private roleService: RoleService
  ) {}

  async authenticate(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !await this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.jwtService.generateTokens(user);

    // Log authentication event
    await this.auditService.logEvent({
      action: 'USER_LOGIN',
      userId: user.id,
      metadata: { timestamp: new Date() }
    });

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async authorize(
    userId: string,
    resource: string,
    action: string,
    workspaceId?: string
  ): Promise<boolean> {
    const userRoles = await this.roleService.getUserRoles(userId, workspaceId);

    return userRoles.some(role =>
      this.roleService.hasPermission(role, resource, action)
    );
  }
}

// GraphQL Schema
@Resolver()
export class AuthResolver {
  @Mutation(() => AuthResult)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string
  ): Promise<AuthResult> {
    return this.authService.authenticate(email, password);
  }

  @Mutation(() => TokenPair)
  async refreshToken(
    @Arg('refreshToken') refreshToken: string
  ): Promise<TokenPair> {
    return this.jwtService.refreshTokens(refreshToken);
  }

  @Query(() => User)
  @Authorized()
  async me(@Ctx() { user }: GraphQLContext): Promise<User> {
    return this.userService.findById(user.id);
  }
}
```

**Environment Variables**:
```env
JWT_SECRET=your-super-secret-jwt-key-256-bits
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

### 3. Content Management Service

**Responsibility**: Knowledge creation, editing, versioning, and organization.

```typescript
// Content Management Service
@Service()
export class ContentService {
  constructor(
    private knowledgeRepository: KnowledgeRepository,
    private versionService: VersionService,
    private searchService: SearchService,
    private eventBus: EventBus
  ) {}

  async createKnowledge(
    input: CreateKnowledgeInput,
    userId: string
  ): Promise<Knowledge> {
    const knowledge = await this.knowledgeRepository.create({
      ...input,
      authorId: userId,
      version: 1,
      status: KnowledgeStatus.DRAFT
    });

    // Index for search
    await this.searchService.indexKnowledge(knowledge);

    // Publish event
    await this.eventBus.publish('knowledge.created', {
      knowledgeId: knowledge.id,
      workspaceId: knowledge.workspaceId,
      authorId: userId
    });

    return knowledge;
  }

  async updateKnowledge(
    id: string,
    input: UpdateKnowledgeInput,
    userId: string
  ): Promise<Knowledge> {
    const knowledge = await this.knowledgeRepository.findById(id);

    // Create version snapshot
    await this.versionService.createVersion(knowledge, input.changeSummary);

    // Update content
    const updated = await this.knowledgeRepository.update(id, {
      ...input,
      version: knowledge.version + 1,
      updatedAt: new Date()
    });

    // Update search index
    await this.searchService.updateIndex(updated);

    // Publish event
    await this.eventBus.publish('knowledge.updated', {
      knowledgeId: id,
      workspaceId: updated.workspaceId,
      authorId: userId,
      changes: input
    });

    return updated;
  }
}

// GraphQL Schema with Federation
@Resolver(() => Knowledge)
export class KnowledgeResolver {
  @Query(() => [Knowledge])
  async knowledgeByWorkspace(
    @Arg('workspaceId') workspaceId: string,
    @Arg('pagination', { nullable: true }) pagination?: PaginationInput
  ): Promise<Knowledge[]> {
    return this.contentService.findByWorkspace(workspaceId, pagination);
  }

  @Mutation(() => Knowledge)
  @Authorized('content:create')
  async createKnowledge(
    @Arg('input') input: CreateKnowledgeInput,
    @Ctx() { user }: GraphQLContext
  ): Promise<Knowledge> {
    return this.contentService.createKnowledge(input, user.id);
  }

  @ResolveField(() => [Tag])
  async tags(@Parent() knowledge: Knowledge): Promise<Tag[]> {
    return this.tagService.findByKnowledge(knowledge.id);
  }
}
```

### 4. Search Service

**Responsibility**: ElasticSearch integration, indexing, and advanced search capabilities.

```typescript
// Search Service
@Service()
export class SearchService {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
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
      updated_at: knowledge.updatedAt,
      // Generate embeddings for semantic search
      content_embedding: await this.generateEmbedding(knowledge.content)
    };

    await this.client.index({
      index: 'knowledge',
      id: knowledge.id,
      body: document
    });
  }

  async search(
    query: string,
    filters: SearchFilters,
    workspaceId: string,
    pagination: PaginationInput
  ): Promise<SearchResult> {
    const searchBody = {
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  // Text search
                  {
                    multi_match: {
                      query,
                      fields: ['title^3', 'content', 'excerpt^2'],
                      fuzziness: 'AUTO',
                      prefix_length: 2
                    }
                  },
                  // Semantic search using embeddings
                  {
                    script_score: {
                      query: { match_all: {} },
                      script: {
                        source: "cosineSimilarity(params.query_vector, 'content_embedding') + 1.0",
                        params: {
                          query_vector: await this.generateEmbedding(query)
                        }
                      }
                    }
                  }
                ]
              }
            }
          ],
          filter: [
            { term: { workspace_id: workspaceId } },
            ...this.buildFilters(filters)
          ]
        }
      },
      highlight: {
        fields: {
          title: {},
          content: { fragment_size: 150, number_of_fragments: 3 }
        }
      },
      aggs: {
        tags: {
          terms: { field: 'tags.keyword', size: 20 }
        },
        authors: {
          terms: { field: 'author_id.keyword', size: 10 }
        }
      },
      from: pagination.offset || 0,
      size: pagination.limit || 20,
      sort: this.buildSort(filters.sortBy)
    };

    const response = await this.client.search({
      index: 'knowledge',
      body: searchBody
    });

    return this.transformSearchResponse(response);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Call AI service for embedding generation
    const response = await this.aiServiceClient.generateEmbedding(text);
    return response.embedding;
  }
}

// GraphQL Schema
@Resolver()
export class SearchResolver {
  @Query(() => SearchResult)
  async searchKnowledge(
    @Arg('query') query: string,
    @Arg('filters', { nullable: true }) filters?: SearchFilters,
    @Arg('workspaceId') workspaceId: string,
    @Arg('pagination', { nullable: true }) pagination?: PaginationInput
  ): Promise<SearchResult> {
    return this.searchService.search(query, filters, workspaceId, pagination);
  }

  @Query(() => [Suggestion])
  async searchSuggestions(
    @Arg('query') query: string,
    @Arg('workspaceId') workspaceId: string
  ): Promise<Suggestion[]> {
    return this.searchService.getSuggestions(query, workspaceId);
  }
}
```

### 5. Collaboration Service

**Responsibility**: Real-time collaboration, WebSocket management, operational transforms.

```typescript
// Collaboration Service
@WebSocketGateway({
  namespace: '/collaboration',
  cors: { origin: '*' }
})
export class CollaborationGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private operationalTransform: OperationalTransformService,
    private presenceService: PresenceService,
    private documentLockService: DocumentLockService
  ) {}

  @SubscribeMessage('join_document')
  async handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinDocumentPayload
  ): Promise<void> {
    const { documentId, userId } = payload;

    // Join document room
    await client.join(`doc_${documentId}`);

    // Update presence
    await this.presenceService.addUser(documentId, userId, client.id);

    // Notify other users
    client.to(`doc_${documentId}`).emit('user_joined', {
      userId,
      timestamp: new Date()
    });

    // Send current document state and active users
    const [document, activeUsers] = await Promise.all([
      this.contentService.getDocument(documentId),
      this.presenceService.getActiveUsers(documentId)
    ]);

    client.emit('document_state', { document, activeUsers });
  }

  @SubscribeMessage('content_change')
  async handleContentChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ContentChangePayload
  ): Promise<void> {
    const { documentId, operation, userId } = payload;

    try {
      // Apply operational transform
      const transformedOp = await this.operationalTransform.apply(
        documentId,
        operation,
        userId
      );

      // Broadcast to other clients
      client.to(`doc_${documentId}`).emit('content_changed', {
        operation: transformedOp,
        userId,
        timestamp: new Date()
      });

      // Schedule auto-save (debounced)
      await this.autoSaveService.schedule(documentId, transformedOp);

    } catch (error) {
      client.emit('operation_error', {
        error: error.message,
        operation
      });
    }
  }

  @SubscribeMessage('cursor_move')
  async handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CursorMovePayload
  ): Promise<void> {
    const { documentId, userId, position } = payload;

    // Update cursor position
    await this.presenceService.updateCursor(documentId, userId, position);

    // Broadcast to other users
    client.to(`doc_${documentId}`).emit('cursor_moved', {
      userId,
      position,
      timestamp: new Date()
    });
  }
}

// Operational Transform Service
@Service()
export class OperationalTransformService {
  private documentStates = new Map<string, DocumentState>();

  async apply(
    documentId: string,
    operation: Operation,
    userId: string
  ): Promise<Operation> {
    const state = this.getDocumentState(documentId);

    // Get concurrent operations
    const concurrentOps = state.getPendingOperations(operation.clientId);

    // Transform against concurrent operations
    let transformedOp = operation;
    for (const concurrentOp of concurrentOps) {
      transformedOp = this.transformOperation(transformedOp, concurrentOp);
    }

    // Apply to document state
    state.applyOperation(transformedOp);

    // Store operation for future transforms
    state.addOperation(transformedOp);

    return transformedOp;
  }

  private transformOperation(op1: Operation, op2: Operation): Operation {
    // Implement operational transform algorithm
    // Based on operation types: insert, delete, retain
    if (op1.type === 'insert' && op2.type === 'insert') {
      return this.transformInsertInsert(op1, op2);
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      return this.transformInsertDelete(op1, op2);
    }
    // ... other transformation cases

    return op1;
  }
}
```

### 6. AI Service

**Responsibility**: Machine learning operations, embeddings, summarization, and AI-powered features.

```typescript
// AI Service
@Service()
export class AIService {
  constructor(
    private embeddingModel: EmbeddingModel,
    private summarizationModel: SummarizationModel,
    private taggingModel: TaggingModel,
    private jobQueue: Queue
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    // Clean and preprocess text
    const cleanText = this.preprocessText(text);

    // Generate embedding using OpenAI or local model
    const response = await this.embeddingModel.embed(cleanText);

    return response.embedding;
  }

  async generateSummary(
    content: string,
    maxLength: number = 150
  ): Promise<string> {
    const response = await this.summarizationModel.summarize(content, {
      maxLength,
      temperature: 0.3
    });

    return response.summary;
  }

  async suggestTags(content: string, workspaceId: string): Promise<string[]> {
    // Get existing tags for context
    const existingTags = await this.tagService.getWorkspaceTags(workspaceId);

    const response = await this.taggingModel.suggest(content, {
      existingTags: existingTags.map(tag => tag.name),
      maxTags: 5
    });

    return response.tags;
  }

  async processKnowledgeAsync(knowledgeId: string): Promise<void> {
    // Add job to queue for async processing
    await this.jobQueue.add('process-knowledge', {
      knowledgeId,
      tasks: ['embedding', 'summarization', 'tagging']
    });
  }

  // Job processor
  @Process('process-knowledge')
  async handleKnowledgeProcessing(job: Job<{ knowledgeId: string; tasks: string[] }>) {
    const { knowledgeId, tasks } = job.data;
    const knowledge = await this.contentService.getById(knowledgeId);

    const results = {};

    if (tasks.includes('embedding')) {
      results.embedding = await this.generateEmbedding(knowledge.content);
    }

    if (tasks.includes('summarization')) {
      results.summary = await this.generateSummary(knowledge.content);
    }

    if (tasks.includes('tagging')) {
      results.suggestedTags = await this.suggestTags(
        knowledge.content,
        knowledge.workspaceId
      );
    }

    // Store results
    await this.aiResultsService.store(knowledgeId, results);
  }
}

// GraphQL Schema
@Resolver()
export class AIResolver {
  @Mutation(() => [String])
  @Authorized('ai:tag-suggestions')
  async suggestTags(
    @Arg('content') content: string,
    @Arg('workspaceId') workspaceId: string
  ): Promise<string[]> {
    return this.aiService.suggestTags(content, workspaceId);
  }

  @Mutation(() => String)
  @Authorized('ai:summarize')
  async generateSummary(
    @Arg('content') content: string,
    @Arg('maxLength', { nullable: true }) maxLength?: number
  ): Promise<string> {
    return this.aiService.generateSummary(content, maxLength);
  }

  @Query(() => [KnowledgeRecommendation])
  async getRecommendations(
    @Arg('knowledgeId') knowledgeId: string,
    @Arg('userId') userId: string
  ): Promise<KnowledgeRecommendation[]> {
    return this.recommendationService.getRecommendations(knowledgeId, userId);
  }
}
```

### 7. Analytics Service

**Responsibility**: Usage analytics, metrics collection, and reporting.

```typescript
// Analytics Service
@Service()
export class AnalyticsService {
  constructor(
    private metricsRepository: MetricsRepository,
    private timeSeriesDB: InfluxDB,
    private reportGenerator: ReportGenerator
  ) {}

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Store in time series database
    await this.timeSeriesDB.writePoint({
      measurement: event.type,
      tags: {
        workspace_id: event.workspaceId,
        user_id: event.userId,
        resource_type: event.resourceType
      },
      fields: {
        value: 1,
        metadata: JSON.stringify(event.metadata)
      },
      timestamp: new Date()
    });

    // Update aggregated metrics
    await this.updateAggregatedMetrics(event);
  }

  async getWorkspaceAnalytics(
    workspaceId: string,
    timeRange: TimeRange
  ): Promise<WorkspaceAnalytics> {
    const [
      userActivity,
      contentMetrics,
      searchMetrics,
      collaborationMetrics
    ] = await Promise.all([
      this.getUserActivity(workspaceId, timeRange),
      this.getContentMetrics(workspaceId, timeRange),
      this.getSearchMetrics(workspaceId, timeRange),
      this.getCollaborationMetrics(workspaceId, timeRange)
    ]);

    return {
      userActivity,
      contentMetrics,
      searchMetrics,
      collaborationMetrics,
      timeRange
    };
  }

  async generateReport(
    workspaceId: string,
    reportType: ReportType,
    options: ReportOptions
  ): Promise<Report> {
    return this.reportGenerator.generate(workspaceId, reportType, options);
  }
}

// GraphQL Schema
@Resolver()
export class AnalyticsResolver {
  @Query(() => WorkspaceAnalytics)
  @Authorized('analytics:read')
  async workspaceAnalytics(
    @Arg('workspaceId') workspaceId: string,
    @Arg('timeRange') timeRange: TimeRangeInput
  ): Promise<WorkspaceAnalytics> {
    return this.analyticsService.getWorkspaceAnalytics(workspaceId, timeRange);
  }

  @Query(() => [UserActivityMetric])
  @Authorized('analytics:read')
  async userActivity(
    @Arg('workspaceId') workspaceId: string,
    @Arg('timeRange') timeRange: TimeRangeInput
  ): Promise<UserActivityMetric[]> {
    return this.analyticsService.getUserActivity(workspaceId, timeRange);
  }

  @Mutation(() => Report)
  @Authorized('analytics:export')
  async generateReport(
    @Arg('workspaceId') workspaceId: string,
    @Arg('reportType') reportType: ReportType,
    @Arg('options') options: ReportOptionsInput
  ): Promise<Report> {
    return this.analyticsService.generateReport(workspaceId, reportType, options);
  }
}
```

## Inter-Service Communication

### Event-Driven Architecture

```typescript
// Event Bus Implementation
@Service()
export class EventBus {
  constructor(
    private redis: Redis,
    private eventHandlers: Map<string, EventHandler[]>
  ) {}

  async publish(event: string, payload: any): Promise<void> {
    const message = {
      event,
      payload,
      timestamp: new Date(),
      id: generateId()
    };

    await this.redis.publish('events', JSON.stringify(message));
  }

  async subscribe(event: string, handler: EventHandler): Promise<void> {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  async startConsumer(): Promise<void> {
    await this.redis.subscribe('events');

    this.redis.on('message', async (channel: string, message: string) => {
      if (channel === 'events') {
        const eventMessage = JSON.parse(message);
        const handlers = this.eventHandlers.get(eventMessage.event) || [];

        for (const handler of handlers) {
          try {
            await handler(eventMessage.payload);
          } catch (error) {
            console.error(`Error handling event ${eventMessage.event}:`, error);
          }
        }
      }
    });
  }
}

// Event Handlers
@Service()
export class KnowledgeEventHandler {
  constructor(
    private searchService: SearchService,
    private analyticsService: AnalyticsService,
    private aiService: AIService
  ) {}

  @EventHandler('knowledge.created')
  async handleKnowledgeCreated(payload: { knowledgeId: string; workspaceId: string; authorId: string }) {
    // Index for search
    const knowledge = await this.contentService.getById(payload.knowledgeId);
    await this.searchService.indexKnowledge(knowledge);

    // Track analytics
    await this.analyticsService.trackEvent({
      type: 'knowledge_created',
      workspaceId: payload.workspaceId,
      userId: payload.authorId,
      resourceType: 'knowledge',
      resourceId: payload.knowledgeId
    });

    // Process with AI (async)
    await this.aiService.processKnowledgeAsync(payload.knowledgeId);
  }

  @EventHandler('knowledge.updated')
  async handleKnowledgeUpdated(payload: { knowledgeId: string; workspaceId: string; authorId: string }) {
    // Update search index
    const knowledge = await this.contentService.getById(payload.knowledgeId);
    await this.searchService.updateIndex(knowledge);

    // Track analytics
    await this.analyticsService.trackEvent({
      type: 'knowledge_updated',
      workspaceId: payload.workspaceId,
      userId: payload.authorId,
      resourceType: 'knowledge',
      resourceId: payload.knowledgeId
    });
  }
}
```

## Service Discovery & Configuration

### Consul Configuration

```typescript
// Service Registry
@Service()
export class ServiceRegistry {
  private consul: Consul;

  constructor() {
    this.consul = new Consul({
      host: process.env.CONSUL_HOST || 'consul',
      port: process.env.CONSUL_PORT || 8500
    });
  }

  async registerService(serviceConfig: ServiceConfig): Promise<void> {
    await this.consul.agent.service.register({
      id: serviceConfig.id,
      name: serviceConfig.name,
      address: serviceConfig.address,
      port: serviceConfig.port,
      tags: serviceConfig.tags,
      check: {
        http: `http://${serviceConfig.address}:${serviceConfig.port}/health`,
        interval: '10s',
        timeout: '3s'
      }
    });
  }

  async discoverService(serviceName: string): Promise<ServiceInstance[]> {
    const services = await this.consul.health.service({
      service: serviceName,
      passing: true
    });

    return services[0].map(service => ({
      id: service.Service.ID,
      address: service.Service.Address,
      port: service.Service.Port
    }));
  }
}
```

## Deployment Configuration

### Docker Compose for Development

```yaml
version: '3.8'

services:
  # Infrastructure
  postgresql:
    image: postgres:15
    environment:
      POSTGRES_DB: knowledge_network
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"

  # Services
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - auth-service
      - content-service

  auth-service:
    build: ./services/auth
    ports:
      - "4001:4001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgresql:5432/knowledge_network
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret-key
    depends_on:
      - postgresql
      - redis

  content-service:
    build: ./services/content
    ports:
      - "4002:4002"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgresql:5432/knowledge_network
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgresql
      - redis

  search-service:
    build: ./services/search
    ports:
      - "4003:4003"
    environment:
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - REDIS_URL=redis://redis:6379
    depends_on:
      - elasticsearch
      - redis

  collaboration-service:
    build: ./services/collaboration
    ports:
      - "4004:4004"
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgresql:5432/knowledge_network
    depends_on:
      - redis
      - postgresql

  ai-service:
    build: ./services/ai
    ports:
      - "4005:4005"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  analytics-service:
    build: ./services/analytics
    ports:
      - "4006:4006"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgresql:5432/knowledge_network
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgresql
      - redis

volumes:
  postgres_data:
```

### Kubernetes Production Deployment

```yaml
# API Gateway Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  labels:
    app: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: knowledge-network/api-gateway:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 4000
  type: LoadBalancer
```

## Monitoring & Observability

### Health Checks

```typescript
// Health Check Controller
@Controller('health')
export class HealthController {
  constructor(
    private db: Database,
    private redis: Redis,
    private consul: Consul
  ) {}

  @Get('/')
  async health(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices()
    ]);

    const isHealthy = checks.every(check => check.status === 'fulfilled');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      services: {
        database: checks[0].status,
        redis: checks[1].status,
        external: checks[2].status
      }
    };
  }

  @Get('/ready')
  async readiness(): Promise<ReadinessStatus> {
    // Check if service is ready to accept traffic
    const isReady = await this.checkServiceReadiness();

    return {
      status: isReady ? 'ready' : 'not-ready',
      timestamp: new Date()
    };
  }
}
```

## Security Considerations

### Service-to-Service Authentication

```typescript
// Service Authentication Middleware
@Injectable()
export class ServiceAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const serviceToken = req.headers['x-service-token'] as string;

    if (!serviceToken || !this.verifyServiceToken(serviceToken)) {
      return res.status(401).json({ error: 'Unauthorized service' });
    }

    next();
  }

  private verifyServiceToken(token: string): boolean {
    try {
      const decoded = jwt.verify(token, process.env.SERVICE_SECRET!);
      return decoded && decoded.type === 'service';
    } catch {
      return false;
    }
  }
}
```

This microservices architecture provides a scalable, maintainable foundation for the Knowledge Network application, with clear service boundaries, efficient communication patterns, and robust deployment strategies.