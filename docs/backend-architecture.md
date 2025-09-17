# Backend Architecture - Knowledge Network React Application

## Overview

This document outlines the comprehensive backend architecture for the Knowledge Network React Application, designed to support real-time collaboration, AI integration, and advanced search capabilities.

## Technology Stack

- **Runtime**: Node.js with Bun
- **Language**: TypeScript
- **API Layer**: GraphQL with TypeGraphQL
- **Database**: PostgreSQL (primary), Redis (caching), ElasticSearch (search)
- **Real-time**: WebSocket with Socket.IO
- **Authentication**: JWT with Role-Based Access Control (RBAC)
- **Containerization**: Docker with Kubernetes

## System Architecture

### Microservices Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Auth Service   │────│ Content Service │
│   (GraphQL)     │    │   (JWT/RBAC)    │    │  (Knowledge)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         └──────────────│ Search Service  │────│Collaboration Svc│
                        │ (ElasticSearch) │    │   (WebSocket)   │
                        └─────────────────┘    └─────────────────┘
                                 │                       │
                        ┌─────────────────┐    ┌─────────────────┐
                        │   AI Service    │────│Analytics Service│
                        │  (LLM/ML Ops)   │    │   (Metrics)     │
                        └─────────────────┘    └─────────────────┘
```

### Core Services

1. **API Gateway Service** - GraphQL federation and routing
2. **Authentication Service** - JWT management and RBAC
3. **Content Management Service** - Knowledge base operations
4. **Search Service** - ElasticSearch integration
5. **Collaboration Service** - Real-time features
6. **AI Service** - Machine learning and NLP
7. **Analytics Service** - Usage metrics and insights

## GraphQL API Design

### Schema Architecture

Using TypeGraphQL for type-safe schema definition with decorators:

```typescript
// Core Knowledge Entity
@ObjectType()
export class Knowledge {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  content: string;

  @Field(() => [Tag])
  tags: Tag[];

  @Field(() => User)
  author: User;

  @Field(() => Workspace)
  workspace: Workspace;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [Knowledge])
  linkedDocuments: Knowledge[];

  @Field(() => KnowledgeStatus)
  status: KnowledgeStatus;
}

// User Management
@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  displayName: string;

  @Field(() => [Role])
  roles: Role[];

  @Field(() => UserPreferences)
  preferences: UserPreferences;
}

// Workspace Organization
@ObjectType()
export class Workspace {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => [Collection])
  collections: Collection[];

  @Field(() => [User])
  members: User[];

  @Field(() => WorkspaceSettings)
  settings: WorkspaceSettings;
}
```

### Query/Mutation Patterns

```typescript
@Resolver(() => Knowledge)
export class KnowledgeResolver {
  @Query(() => [Knowledge])
  async searchKnowledge(
    @Arg("query") query: string,
    @Arg("filters", { nullable: true }) filters?: SearchFilters,
    @Arg("pagination", { nullable: true }) pagination?: PaginationInput,
    @Ctx() context: GraphQLContext
  ): Promise<Knowledge[]> {
    return this.knowledgeService.search(query, filters, pagination, context.user);
  }

  @Mutation(() => Knowledge)
  async createKnowledge(
    @Arg("input") input: CreateKnowledgeInput,
    @Ctx() context: GraphQLContext
  ): Promise<Knowledge> {
    return this.knowledgeService.create(input, context.user);
  }

  @Subscription(() => KnowledgeUpdateEvent)
  knowledgeUpdates(
    @Arg("workspaceId") workspaceId: string,
    @Ctx() context: GraphQLContext
  ): AsyncIterator<KnowledgeUpdateEvent> {
    return this.pubSub.asyncIterator(`knowledge_updates_${workspaceId}`);
  }
}
```

## Database Schema Design

### PostgreSQL Schema

```sql
-- Core Tables
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_delta JSONB, -- Rich text editor state
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  collection_id UUID REFERENCES collections(id),
  status knowledge_status DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Full-text search
  content_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED,

  -- Indexing
  INDEX idx_knowledge_workspace (workspace_id),
  INDEX idx_knowledge_author (author_id),
  INDEX idx_knowledge_content_search USING GIN (content_vector),
  INDEX idx_knowledge_updated_at (updated_at DESC)
);

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES collections(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Hex color
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(name, workspace_id)
);

CREATE TABLE knowledge_tags (
  knowledge_id UUID REFERENCES knowledge(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_id, tag_id)
);

-- Knowledge Linking (Graph Structure)
CREATE TABLE knowledge_links (
  source_id UUID REFERENCES knowledge(id) ON DELETE CASCADE,
  target_id UUID REFERENCES knowledge(id) ON DELETE CASCADE,
  link_type VARCHAR(50) DEFAULT 'references',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (source_id, target_id)
);

-- Collaboration Features
CREATE TABLE knowledge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID REFERENCES knowledge(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_delta JSONB,
  author_id UUID REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID REFERENCES knowledge(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  position_data JSONB, -- Editor position info
  parent_id UUID REFERENCES comments(id), -- For nested comments
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permission System
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  is_system_role BOOLEAN DEFAULT false,

  UNIQUE(name, workspace_id)
);

CREATE TABLE user_workspace_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (user_id, workspace_id, role_id)
);

-- Analytics and Activity
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  workspace_id UUID REFERENCES workspaces(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  INDEX idx_activity_user_time (user_id, created_at DESC),
  INDEX idx_activity_workspace_time (workspace_id, created_at DESC)
);
```

### Enums and Types

```sql
CREATE TYPE knowledge_status AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deactivated');
CREATE TYPE activity_action AS ENUM ('create', 'update', 'delete', 'view', 'share', 'comment');
```

## Real-time Collaboration Architecture

### WebSocket Infrastructure

```typescript
// Socket.IO Event Handlers
export class CollaborationGateway {
  @WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/collaboration'
  })
  export class CollaborationGateway {

    @SubscribeMessage('join_document')
    async handleJoinDocument(
      client: Socket,
      payload: { documentId: string, userId: string }
    ) {
      // Add user to document room
      await client.join(`doc_${payload.documentId}`);

      // Notify other users
      client.to(`doc_${payload.documentId}`).emit('user_joined', {
        userId: payload.userId,
        timestamp: new Date()
      });

      // Send current document state
      const document = await this.knowledgeService.getById(payload.documentId);
      client.emit('document_state', document);
    }

    @SubscribeMessage('content_change')
    async handleContentChange(
      client: Socket,
      payload: ContentChangeEvent
    ) {
      // Apply operational transform
      const transformedOp = await this.otService.transform(payload.operation);

      // Broadcast to other clients
      client.to(`doc_${payload.documentId}`).emit('content_changed', {
        operation: transformedOp,
        userId: payload.userId,
        timestamp: new Date()
      });

      // Save to database (debounced)
      await this.saveService.scheduleAutoSave(payload.documentId, transformedOp);
    }
  }
}
```

### Operational Transform (OT) Implementation

```typescript
export class OperationalTransformService {
  async transform(operation: Operation, concurrentOps: Operation[]): Promise<Operation> {
    let transformedOp = operation;

    for (const concurrentOp of concurrentOps) {
      transformedOp = this.transformOperation(transformedOp, concurrentOp);
    }

    return transformedOp;
  }

  private transformOperation(op1: Operation, op2: Operation): Operation {
    // Implementation based on operational transform theory
    // Handle insert, delete, retain operations
    // Ensure convergence and intention preservation
  }
}
```

## Integration Patterns

### ElasticSearch Integration

```typescript
export class SearchService {
  private client: Client;

  async indexKnowledge(knowledge: Knowledge): Promise<void> {
    await this.client.index({
      index: 'knowledge',
      id: knowledge.id,
      body: {
        title: knowledge.title,
        content: knowledge.content,
        tags: knowledge.tags.map(tag => tag.name),
        workspace_id: knowledge.workspace.id,
        author_id: knowledge.author.id,
        created_at: knowledge.createdAt,
        updated_at: knowledge.updatedAt,
        content_embedding: await this.generateEmbedding(knowledge.content)
      }
    });
  }

  async searchKnowledge(
    query: string,
    filters: SearchFilters,
    workspaceId: string
  ): Promise<SearchResult[]> {
    const searchBody = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'content', 'tags^2'],
                fuzziness: 'AUTO'
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
      sort: [
        { _score: { order: 'desc' } },
        { updated_at: { order: 'desc' } }
      ]
    };

    const response = await this.client.search({
      index: 'knowledge',
      body: searchBody
    });

    return this.transformSearchResults(response.body.hits.hits);
  }
}
```

### Redis Caching Strategy

```typescript
export class CacheService {
  private redis: Redis;

  // Cache frequently accessed knowledge
  async cacheKnowledge(knowledge: Knowledge): Promise<void> {
    const key = `knowledge:${knowledge.id}`;
    await this.redis.setex(key, 3600, JSON.stringify(knowledge)); // 1 hour TTL
  }

  // Cache search results
  async cacheSearchResults(
    queryHash: string,
    results: SearchResult[],
    ttl: number = 300 // 5 minutes
  ): Promise<void> {
    const key = `search:${queryHash}`;
    await this.redis.setex(key, ttl, JSON.stringify(results));
  }

  // Session management
  async storeUserSession(sessionId: string, userData: UserSession): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.setex(key, 86400, JSON.stringify(userData)); // 24 hours
  }

  // Real-time presence
  async updateUserPresence(userId: string, workspaceId: string): Promise<void> {
    const key = `presence:${workspaceId}`;
    await this.redis.hset(key, userId, Date.now());
    await this.redis.expire(key, 300); // 5 minutes
  }
}
```

## Authentication & Authorization

### JWT Implementation

```typescript
export class AuthService {
  async generateTokens(user: User): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(role => role.name)
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '15m'
    });

    const refreshToken = jwt.sign(
      { sub: user.id },
      process.env.REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Store refresh token in Redis
    await this.cacheService.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### RBAC Implementation

```typescript
export class AuthorizationService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    workspaceId?: string
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId, workspaceId);

    for (const role of userRoles) {
      if (this.roleHasPermission(role, resource, action)) {
        return true;
      }
    }

    return false;
  }

  private roleHasPermission(role: Role, resource: string, action: string): boolean {
    return role.permissions.some(permission =>
      permission.resource === resource && permission.actions.includes(action)
    );
  }
}
```

## Performance Optimizations

### Database Optimizations

1. **Connection Pooling**: Use pg-pool with proper sizing
2. **Query Optimization**: Implement prepared statements and query analysis
3. **Indexing Strategy**: Strategic indexes for search patterns
4. **Partitioning**: Time-based partitioning for activity logs

### Caching Strategy

1. **Application Level**: Redis for frequently accessed data
2. **Query Level**: GraphQL query result caching
3. **CDN**: Static asset caching
4. **Database Level**: PostgreSQL query plan caching

### Real-time Optimizations

1. **Connection Management**: Socket.IO clustering with Redis adapter
2. **Message Batching**: Batch frequent operations
3. **Selective Broadcasting**: Room-based message targeting

## Monitoring & Observability

### Metrics Collection

```typescript
export class MetricsService {
  async recordAPICall(
    endpoint: string,
    duration: number,
    status: number
  ): Promise<void> {
    await this.prometheus.histogram
      .labels({ endpoint, status: status.toString() })
      .observe(duration);
  }

  async recordDatabaseQuery(
    query: string,
    duration: number
  ): Promise<void> {
    await this.prometheus.dbQueryDuration
      .labels({ query_type: this.categorizeQuery(query) })
      .observe(duration);
  }
}
```

### Health Checks

```typescript
@Controller('health')
export class HealthController {
  @Get('/')
  async getHealth(): Promise<HealthStatus> {
    const [db, redis, elasticsearch] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkElasticsearch()
    ]);

    return {
      status: 'healthy',
      services: {
        database: db.status,
        redis: redis.status,
        elasticsearch: elasticsearch.status
      },
      timestamp: new Date()
    };
  }
}
```

## Security Considerations

### API Security

1. **Rate Limiting**: GraphQL complexity analysis and query depth limiting
2. **Input Validation**: Strong input validation and sanitization
3. **Authentication**: JWT with secure secret rotation
4. **Authorization**: Fine-grained RBAC implementation

### Data Security

1. **Encryption**: Sensitive data encryption at rest
2. **Audit Logging**: Comprehensive activity logging
3. **Access Control**: Workspace-level data isolation
4. **Backup Security**: Encrypted backups with retention policies

## Deployment Architecture

### Docker Configuration

```dockerfile
# Dockerfile for API service
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/
COPY prisma/ ./prisma/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: knowledge-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: knowledge-api
  template:
    metadata:
      labels:
        app: knowledge-api
    spec:
      containers:
      - name: api
        image: knowledge-network/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
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
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

This architecture provides a scalable, maintainable, and secure foundation for the Knowledge Network React Application, supporting all required features including real-time collaboration, AI integration, and advanced search capabilities.