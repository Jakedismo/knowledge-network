# Backend API Architecture - Knowledge Network React Application

## Executive Summary

This document outlines a comprehensive backend API architecture for a Knowledge Network React Application built with Next.js 15+. The architecture emphasizes performance (sub-500ms response times), real-time collaboration, AI integration, and scalability while maintaining security and maintainability.

## 1. GraphQL Schema Architecture

### 1.1 Core Entity Schema

```graphql
# User Management
type User {
  id: ID!
  email: String!
  displayName: String!
  avatar: String
  role: UserRole!
  permissions: [Permission!]!
  workspaces: [Workspace!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  lastActiveAt: DateTime
  preferences: UserPreferences!
}

type UserPreferences {
  theme: Theme!
  language: String!
  notifications: NotificationSettings!
  editor: EditorSettings!
}

enum UserRole {
  ADMIN
  EDITOR
  CONTRIBUTOR
  VIEWER
}

# Workspace & Organization
type Workspace {
  id: ID!
  name: String!
  description: String
  owner: User!
  members: [WorkspaceMember!]!
  collections: [Collection!]!
  settings: WorkspaceSettings!
  knowledgeGraph: KnowledgeGraph!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Collection {
  id: ID!
  name: String!
  description: String
  workspace: Workspace!
  parent: Collection
  children: [Collection!]!
  documents: [Document!]!
  tags: [Tag!]!
  metadata: JSON!
  permissions: CollectionPermissions!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Knowledge Management
type Document {
  id: ID!
  title: String!
  content: JSON! # Lexical/Slate editor state
  contentText: String! # Plain text for search
  version: Int!
  status: DocumentStatus!
  template: Template
  collection: Collection!
  author: User!
  collaborators: [User!]!
  tags: [Tag!]!
  links: [DocumentLink!]!
  backlinks: [DocumentLink!]!
  aiInsights: AIInsights!
  comments: [Comment!]!
  versions: [DocumentVersion!]!
  metadata: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
  lastEditedBy: User!
  lastEditedAt: DateTime!
}

enum DocumentStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  ARCHIVED
}

type DocumentVersion {
  id: ID!
  version: Int!
  content: JSON!
  author: User!
  changesSummary: String
  createdAt: DateTime!
}

type DocumentLink {
  id: ID!
  source: Document!
  target: Document!
  type: LinkType!
  context: String
  createdBy: User!
  createdAt: DateTime!
}

enum LinkType {
  REFERENCES
  RELATES_TO
  CONTRADICTS
  EXTENDS
  CITES
}

# Real-time Collaboration
type CollaborationSession {
  id: ID!
  document: Document!
  participants: [User!]!
  cursors: [EditorCursor!]!
  selections: [EditorSelection!]!
  operations: [Operation!]!
  createdAt: DateTime!
}

type EditorCursor {
  userId: ID!
  position: Int!
  color: String!
  updatedAt: DateTime!
}

type Operation {
  id: ID!
  type: OperationType!
  payload: JSON!
  author: User!
  timestamp: DateTime!
  applied: Boolean!
}

# AI Integration
type AIInsights {
  id: ID!
  document: Document!
  summary: String
  keyTopics: [String!]!
  suggestedTags: [String!]!
  qualityScore: Float
  readabilityScore: Float
  sentiment: Float
  suggestedLinks: [DocumentLink!]!
  factChecks: [FactCheck!]!
  translations: [Translation!]!
  lastUpdated: DateTime!
}

type FactCheck {
  id: ID!
  statement: String!
  accuracy: Float!
  sources: [String!]!
  confidence: Float!
}

# Search & Discovery
type SearchResult {
  document: Document!
  score: Float!
  highlights: [SearchHighlight!]!
  explanation: String
}

type SearchHighlight {
  field: String!
  fragments: [String!]!
}

# Analytics
type Analytics {
  document: Document!
  views: Int!
  edits: Int!
  collaborators: Int!
  avgReadTime: Float
  engagement: Float!
  trends: [AnalyticsTrend!]!
}

# Comments & Reviews
type Comment {
  id: ID!
  document: Document!
  author: User!
  content: String!
  position: JSON # Editor position
  thread: [Comment!]!
  resolved: Boolean!
  mentions: [User!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Templates
type Template {
  id: ID!
  name: String!
  description: String
  category: TemplateCategory!
  content: JSON!
  variables: [TemplateVariable!]!
  workspace: Workspace
  author: User!
  isPublic: Boolean!
  usageCount: Int!
  rating: Float
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### 1.2 Query & Mutation Schema

```graphql
type Query {
  # User queries
  me: User
  user(id: ID!): User

  # Workspace queries
  workspace(id: ID!): Workspace
  workspaces: [Workspace!]!

  # Document queries
  document(id: ID!): Document
  documents(
    collectionId: ID
    workspaceId: ID
    filters: DocumentFilters
    sort: DocumentSort
    pagination: PaginationInput
  ): DocumentConnection!

  # Search queries
  search(
    query: String!
    filters: SearchFilters
    facets: [SearchFacet!]
    sort: SearchSort
    pagination: PaginationInput
  ): SearchConnection!

  # AI queries
  suggestions(documentId: ID!): [Suggestion!]!
  recommendations(userId: ID!, limit: Int): [Document!]!

  # Analytics queries
  analytics(
    documentId: ID
    workspaceId: ID
    timeRange: TimeRange!
  ): Analytics!
}

type Mutation {
  # Authentication
  signIn(input: SignInInput!): AuthPayload!
  signOut: Boolean!
  refreshToken(refreshToken: String!): AuthPayload!

  # Document mutations
  createDocument(input: CreateDocumentInput!): Document!
  updateDocument(id: ID!, input: UpdateDocumentInput!): Document!
  deleteDocument(id: ID!): Boolean!
  duplicateDocument(id: ID!): Document!

  # Collaboration mutations
  joinCollaboration(documentId: ID!): CollaborationSession!
  leaveCollaboration(documentId: ID!): Boolean!
  applyOperation(
    documentId: ID!
    operations: [OperationInput!]!
  ): OperationResult!

  # Comments
  createComment(input: CreateCommentInput!): Comment!
  updateComment(id: ID!, content: String!): Comment!
  resolveComment(id: ID!): Comment!

  # AI actions
  generateSummary(documentId: ID!): String!
  suggestTags(documentId: ID!): [String!]!
  improveContent(documentId: ID!, instruction: String!): String!

  # Workspace management
  createWorkspace(input: CreateWorkspaceInput!): Workspace!
  updateWorkspace(id: ID!, input: UpdateWorkspaceInput!): Workspace!
  inviteToWorkspace(
    workspaceId: ID!
    email: String!
    role: UserRole!
  ): WorkspaceMember!
}

type Subscription {
  # Real-time collaboration
  documentChanged(documentId: ID!): DocumentChangePayload!
  collaborationUpdated(documentId: ID!): CollaborationUpdate!
  cursorMoved(documentId: ID!): CursorUpdate!

  # Notifications
  notificationReceived(userId: ID!): Notification!

  # Comments
  commentAdded(documentId: ID!): Comment!
  commentResolved(documentId: ID!): Comment!
}
```

## 2. API Structure for Real-time Collaboration

### 2.1 WebSocket + HTTP Hybrid Architecture

```typescript
// WebSocket Event Types
interface WebSocketEvents {
  // Connection events
  'connection': { userId: string; documentId: string }
  'disconnect': { userId: string; reason: string }

  // Document operations
  'operation': {
    documentId: string
    operations: Operation[]
    authorId: string
    version: number
  }
  'operation_ack': {
    operationId: string
    applied: boolean
    version: number
  }

  // Cursor tracking
  'cursor_update': {
    documentId: string
    userId: string
    position: number
    selection?: [number, number]
  }

  // Presence
  'user_joined': { userId: string; user: User }
  'user_left': { userId: string }
  'user_typing': { userId: string; position: number }

  // Comments
  'comment_added': Comment
  'comment_resolved': { commentId: string }

  // Document status
  'document_locked': { documentId: string; lockedBy: string }
  'document_unlocked': { documentId: string }
}

// Operational Transform Service
class OperationalTransform {
  transformOperations(
    clientOps: Operation[],
    serverOps: Operation[],
    baseVersion: number
  ): Operation[] {
    // Implement OT algorithm for conflict resolution
    return transformedOps
  }

  applyOperations(
    content: DocumentContent,
    operations: Operation[]
  ): DocumentContent {
    // Apply operations to document content
    return updatedContent
  }
}

// WebSocket Connection Manager
class CollaborationManager {
  private connections = new Map<string, Set<WebSocket>>()
  private documents = new Map<string, DocumentState>()

  async handleConnection(ws: WebSocket, userId: string, documentId: string) {
    // Add to active connections
    // Send current document state
    // Notify other participants
  }

  async handleOperation(
    ws: WebSocket,
    operation: OperationMessage
  ) {
    // Transform operation against concurrent operations
    // Apply to document
    // Broadcast to other clients
    // Persist to database
  }
}
```

### 2.2 HTTP API Endpoints

```typescript
// REST API for non-real-time operations
interface APIEndpoints {
  // Authentication
  'POST /api/auth/signin': (body: SignInInput) => AuthResponse
  'POST /api/auth/signout': () => void
  'POST /api/auth/refresh': (body: RefreshInput) => AuthResponse

  // Documents
  'GET /api/documents': (query: DocumentQuery) => DocumentConnection
  'GET /api/documents/:id': () => Document
  'POST /api/documents': (body: CreateDocumentInput) => Document
  'PUT /api/documents/:id': (body: UpdateDocumentInput) => Document
  'DELETE /api/documents/:id': () => void

  // Search
  'GET /api/search': (query: SearchQuery) => SearchConnection
  'POST /api/search/index': (body: { documentId: string }) => void

  // AI Services
  'POST /api/ai/summarize': (body: { documentId: string }) => Summary
  'POST /api/ai/suggest-tags': (body: { content: string }) => string[]
  'POST /api/ai/improve': (body: ImproveContentInput) => string

  // Analytics
  'GET /api/analytics/document/:id': () => DocumentAnalytics
  'GET /api/analytics/workspace/:id': () => WorkspaceAnalytics

  // File uploads
  'POST /api/files/upload': (formData: FormData) => FileUpload
  'GET /api/files/:id': () => File
}
```

## 3. Authentication & Authorization Framework

### 3.1 JWT-based Authentication

```typescript
// Token structure
interface JWTPayload {
  sub: string // user ID
  email: string
  role: UserRole
  workspaces: string[]
  permissions: string[]
  iat: number
  exp: number
  jti: string // token ID for revocation
}

// Refresh token management
interface RefreshToken {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  lastUsed: Date
  deviceInfo?: string
}

// Authentication service
class AuthenticationService {
  async signIn(email: string, password: string): Promise<AuthResponse> {
    // Validate credentials
    // Generate access + refresh tokens
    // Update last login
    // Return tokens + user info
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Validate refresh token
    // Check if revoked
    // Generate new access token
    // Optionally rotate refresh token
  }

  async revokeToken(tokenId: string): Promise<void> {
    // Add to revocation list
    // Clean up sessions
  }
}
```

### 3.2 Role-Based Access Control (RBAC)

```typescript
// Permission system
enum Permission {
  // Document permissions
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_PUBLISH = 'document:publish',

  // Collection permissions
  COLLECTION_CREATE = 'collection:create',
  COLLECTION_MANAGE = 'collection:manage',

  // Workspace permissions
  WORKSPACE_ADMIN = 'workspace:admin',
  WORKSPACE_INVITE = 'workspace:invite',

  // AI permissions
  AI_SUMMARIZE = 'ai:summarize',
  AI_IMPROVE = 'ai:improve',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export'
}

// Role definitions
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // All permissions
    ...Object.values(Permission)
  ],
  [UserRole.EDITOR]: [
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,
    Permission.DOCUMENT_PUBLISH,
    Permission.COLLECTION_CREATE,
    Permission.AI_SUMMARIZE,
    Permission.AI_IMPROVE,
    Permission.ANALYTICS_READ
  ],
  [UserRole.CONTRIBUTOR]: [
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,
    Permission.AI_SUMMARIZE,
    Permission.ANALYTICS_READ
  ],
  [UserRole.VIEWER]: [
    Permission.DOCUMENT_READ,
    Permission.ANALYTICS_READ
  ]
}

// Authorization middleware
class AuthorizationService {
  hasPermission(
    user: User,
    permission: Permission,
    resource?: Resource
  ): boolean {
    // Check role-based permissions
    // Check resource-specific permissions
    // Check workspace membership
    return authorized
  }

  async authorizeDocument(
    userId: string,
    documentId: string,
    action: Permission
  ): Promise<boolean> {
    // Get document and workspace
    // Check permissions
    // Verify membership
    return authorized
  }
}
```

## 4. Database Schema Design

### 4.1 PostgreSQL Schema

```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar TEXT,
  role user_role NOT NULL DEFAULT 'CONTRIBUTOR',
  email_verified BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  device_info TEXT,
  revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace membership
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  permissions JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  path LTREE, -- For hierarchical queries
  metadata JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_workspace ON collections(workspace_id);
CREATE INDEX idx_collections_parent ON collections(parent_id);
CREATE INDEX idx_collections_path ON collections USING GIST(path);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL, -- Editor state
  content_text TEXT NOT NULL, -- Plain text for search
  version INTEGER DEFAULT 1,
  status document_status DEFAULT 'DRAFT',
  template_id UUID REFERENCES templates(id),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) NOT NULL,
  last_edited_by UUID REFERENCES users(id) NOT NULL,
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_collection ON documents(collection_id);
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_updated ON documents(updated_at);

-- Full-text search
CREATE INDEX idx_documents_search ON documents
USING gin(to_tsvector('english', title || ' ' || content_text));

-- Document versions (for version history)
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  changes_summary TEXT,
  author_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version)
);

-- Document links (for knowledge graph)
CREATE TABLE document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  target_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  link_type link_type NOT NULL,
  context TEXT,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, target_id, link_type)
);

CREATE INDEX idx_document_links_source ON document_links(source_id);
CREATE INDEX idx_document_links_target ON document_links(target_id);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7), -- Hex color
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document tags (many-to-many)
CREATE TABLE document_tags (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(document_id, tag_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position JSONB, -- Editor position
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_document ON comments(document_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- AI Insights
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  key_topics JSONB DEFAULT '[]',
  suggested_tags JSONB DEFAULT '[]',
  quality_score FLOAT,
  readability_score FLOAT,
  sentiment_score FLOAT,
  fact_checks JSONB DEFAULT '[]',
  translations JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  content JSONB NOT NULL,
  variables JSONB DEFAULT '[]',
  workspace_id UUID REFERENCES workspaces(id),
  author_id UUID REFERENCES users(id) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  rating FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics (time-series data)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  document_id UUID REFERENCES documents(id),
  user_id UUID REFERENCES users(id),
  workspace_id UUID REFERENCES workspaces(id),
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned by timestamp for performance
CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_analytics_document ON analytics_events(document_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER');
CREATE TYPE document_status AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE link_type AS ENUM ('REFERENCES', 'RELATES_TO', 'CONTRADICTS', 'EXTENDS', 'CITES');
CREATE TYPE template_category AS ENUM ('MEETING_NOTES', 'PROJECT_PLAN', 'RESEARCH', 'DOCUMENTATION', 'REPORT', 'TUTORIAL', 'CUSTOM');
```

### 4.2 Redis Schema (Caching & Real-time)

```typescript
// Redis key patterns
interface RedisKeys {
  // Session management
  'session:${userId}': UserSession
  'active_sessions:${userId}': string[] // Session IDs

  // Document collaboration
  'collab:${documentId}': CollaborationState
  'collab:cursors:${documentId}': Record<string, EditorCursor>
  'collab:presence:${documentId}': string[] // Active user IDs

  // Caching
  'cache:document:${documentId}': Document
  'cache:search:${query_hash}': SearchResult[]
  'cache:user:${userId}': User
  'cache:ai:summary:${documentId}': string

  // Rate limiting
  'ratelimit:${userId}:${endpoint}': number
  'ratelimit:ip:${ip}:${endpoint}': number

  // Notifications
  'notifications:${userId}': Notification[]
  'notification_queue:${userId}': string[] // Pending notifications

  // Real-time operations
  'ops:${documentId}:${version}': Operation[]
  'ops_queue:${documentId}': Operation[]
}

// Collaboration state in Redis
interface CollaborationState {
  documentId: string
  participants: string[] // User IDs
  version: number
  lastOperation: string
  operationQueue: Operation[]
}
```

### 4.3 ElasticSearch Schema

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "content": {
        "type": "text",
        "analyzer": "english"
      },
      "contentText": {
        "type": "text",
        "analyzer": "english"
      },
      "author": {
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" }
        }
      },
      "workspace": {
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" }
        }
      },
      "collection": {
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" },
          "path": { "type": "text" }
        }
      },
      "tags": {
        "type": "nested",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "keyword" }
        }
      },
      "status": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" },
      "metadata": { "type": "object" },
      "aiInsights": {
        "properties": {
          "summary": { "type": "text" },
          "keyTopics": { "type": "keyword" },
          "qualityScore": { "type": "float" },
          "readabilityScore": { "type": "float" }
        }
      }
    }
  },
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "english": {
          "type": "standard",
          "stopwords": "_english_"
        }
      }
    }
  }
}
```

## 5. API Versioning & Backwards Compatibility

### 5.1 Versioning Strategy

```typescript
// API versioning via headers
interface VersioningStrategy {
  // Header-based versioning (preferred)
  'API-Version': '2024-01-01'
  'Accept': 'application/vnd.knowledge-network.v1+json'

  // URL-based versioning (fallback)
  path: '/api/v1/documents'

  // Query parameter versioning (legacy support)
  query: '?version=v1'
}

// Version compatibility matrix
const API_VERSIONS = {
  'v1': {
    supported: true,
    deprecationDate: '2025-06-01',
    sunsetDate: '2025-12-01',
    features: ['basic_crud', 'search', 'auth']
  },
  'v2': {
    supported: true,
    features: ['basic_crud', 'search', 'auth', 'realtime', 'ai']
  }
}

// Backwards compatibility layer
class VersionAdapter {
  adaptRequest(version: string, request: Request): Request {
    // Transform request to current schema
    switch (version) {
      case 'v1':
        return this.adaptV1Request(request)
      default:
        return request
    }
  }

  adaptResponse(version: string, response: Response): Response {
    // Transform response to requested version format
    switch (version) {
      case 'v1':
        return this.adaptV1Response(response)
      default:
        return response
    }
  }
}
```

### 5.2 Schema Evolution

```typescript
// GraphQL schema versioning
const SCHEMA_EVOLUTION = {
  '2024-01-01': {
    changes: ['Added AI insights', 'New collaboration fields'],
    breaking: false,
    deprecated: []
  },
  '2024-02-01': {
    changes: ['Enhanced search facets', 'Template system'],
    breaking: false,
    deprecated: ['old_search_format']
  },
  '2024-03-01': {
    changes: ['Real-time subscriptions', 'Advanced permissions'],
    breaking: true,
    deprecated: ['legacy_permissions']
  }
}

// Deprecation warnings
interface DeprecationWarning {
  field: string
  reason: string
  alternative: string
  removalDate: string
}

// Field deprecation in GraphQL
type Document {
  # Deprecated: Use aiInsights.summary instead
  summary: String @deprecated(reason: "Use aiInsights.summary instead")

  # Current field
  aiInsights: AIInsights!
}
```

## 6. Rate Limiting & Security Middleware

### 6.1 Rate Limiting Strategy

```typescript
// Multi-tier rate limiting
interface RateLimitConfig {
  // Global limits
  global: {
    requests: 10000
    window: '1h'
  }

  // Per-user limits
  user: {
    requests: 1000
    window: '1h'
    burst: 100 // Allow burst for collaboration
  }

  // Per-IP limits
  ip: {
    requests: 100
    window: '15m'
  }

  // Endpoint-specific limits
  endpoints: {
    '/api/ai/*': { requests: 50, window: '1h' }
    '/api/search': { requests: 300, window: '1h' }
    '/api/documents/*/operations': { requests: 1000, window: '15m' }
  }
}

// Rate limiter implementation
class RateLimiter {
  private redis: Redis

  async checkLimit(
    identifier: string,
    limits: RateLimit
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`
    const window = limits.window
    const maxRequests = limits.requests

    const pipeline = this.redis.pipeline()
    const now = Date.now()
    const windowStart = now - (window * 1000)

    // Sliding window log
    pipeline.zremrangebyscore(key, '-inf', windowStart)
    pipeline.zcard(key)
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    pipeline.expire(key, window)

    const results = await pipeline.exec()
    const current = results[1][1] as number

    return {
      allowed: current < maxRequests,
      remaining: Math.max(0, maxRequests - current - 1),
      resetTime: windowStart + (window * 1000)
    }
  }
}
```

### 6.2 Security Middleware Stack

```typescript
// Comprehensive security middleware
class SecurityMiddleware {
  // CORS configuration
  private corsOptions = {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://app.knowledge-network.com']
      : ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  }

  // Helmet security headers
  private helmetOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }

  // Input validation middleware
  async validateInput(req: Request): Promise<ValidationResult> {
    // Sanitize inputs
    // Validate against schema
    // Check for SQL injection
    // Check for XSS attempts
    // Validate file uploads
    return { valid: true, errors: [] }
  }

  // Authentication middleware
  async authenticate(req: Request): Promise<User | null> {
    const token = this.extractToken(req)
    if (!token) return null

    try {
      const payload = await this.verifyToken(token)
      const user = await this.getUser(payload.sub)

      // Check if token is revoked
      if (await this.isTokenRevoked(payload.jti)) {
        throw new Error('Token revoked')
      }

      return user
    } catch (error) {
      return null
    }
  }

  // Authorization middleware
  async authorize(
    user: User,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Check role-based permissions
    // Check resource-specific permissions
    // Check workspace membership
    // Log authorization attempts
    return authorized
  }
}
```

## 7. Performance Optimization Strategies

### 7.1 Caching Architecture

```typescript
// Multi-level caching strategy
class CachingService {
  private l1Cache: Map<string, any> = new Map() // In-memory
  private l2Cache: Redis // Distributed
  private cdnCache: CloudFlare // Edge

  // Cache hierarchy
  async get(key: string): Promise<any> {
    // L1: Memory cache (fastest)
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key)
    }

    // L2: Redis cache
    const l2Value = await this.l2Cache.get(key)
    if (l2Value) {
      this.l1Cache.set(key, l2Value)
      return l2Value
    }

    // L3: Database
    return null
  }

  // Cache invalidation strategies
  async invalidate(pattern: string): Promise<void> {
    // Clear L1 cache
    for (const key of this.l1Cache.keys()) {
      if (key.match(pattern)) {
        this.l1Cache.delete(key)
      }
    }

    // Clear L2 cache
    await this.l2Cache.del(pattern)

    // Purge CDN cache
    await this.purgeCDN(pattern)
  }

  // Smart caching with TTL
  private getCacheTTL(dataType: string): number {
    const ttls = {
      'user_profile': 3600, // 1 hour
      'document_content': 300, // 5 minutes
      'search_results': 900, // 15 minutes
      'ai_summary': 7200, // 2 hours
      'analytics': 1800 // 30 minutes
    }
    return ttls[dataType] || 300
  }
}
```

### 7.2 Database Optimization

```typescript
// Database optimization strategies
class DatabaseOptimizer {
  // Connection pooling
  private pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  })

  // Query optimization
  async optimizedDocumentQuery(filters: DocumentFilters): Promise<Document[]> {
    const query = `
      SELECT d.*, u.display_name as author_name
      FROM documents d
      INNER JOIN users u ON d.author_id = u.id
      WHERE ($1::uuid IS NULL OR d.collection_id = $1)
        AND ($2::text IS NULL OR d.status = $2)
        AND ($3::timestamptz IS NULL OR d.updated_at >= $3)
      ORDER BY d.updated_at DESC
      LIMIT $4 OFFSET $5
    `

    return this.pool.query(query, [
      filters.collectionId,
      filters.status,
      filters.updatedAfter,
      filters.limit,
      filters.offset
    ])
  }

  // Read replicas for scaling
  async readQuery(sql: string, params: any[]): Promise<any> {
    // Route read queries to read replica
    const replica = this.getReadReplica()
    return replica.query(sql, params)
  }

  async writeQuery(sql: string, params: any[]): Promise<any> {
    // Route write queries to primary
    return this.pool.query(sql, params)
  }

  // Prepared statements
  private preparedStatements = new Map<string, PreparedStatement>()

  async executePrepared(name: string, params: any[]): Promise<any> {
    if (!this.preparedStatements.has(name)) {
      // Prepare statement on first use
      await this.prepareStatement(name)
    }
    return this.pool.query({ name, values: params })
  }
}
```

### 7.3 Real-time Performance

```typescript
// WebSocket connection optimization
class WebSocketOptimizer {
  private connections = new Map<string, WebSocket>()
  private rooms = new Map<string, Set<string>>() // documentId -> userIds

  // Connection pooling and load balancing
  async distributeConnection(userId: string, documentId: string): Promise<void> {
    const serverId = this.selectOptimalServer(documentId)
    const connection = await this.establishConnection(serverId)

    this.connections.set(userId, connection)
    this.addToRoom(documentId, userId)
  }

  // Message batching for performance
  private messageQueue = new Map<string, Operation[]>()
  private batchTimer: NodeJS.Timeout

  queueOperation(documentId: string, operation: Operation): void {
    if (!this.messageQueue.has(documentId)) {
      this.messageQueue.set(documentId, [])
    }

    this.messageQueue.get(documentId)!.push(operation)

    // Batch operations and flush every 50ms
    clearTimeout(this.batchTimer)
    this.batchTimer = setTimeout(() => this.flushBatch(), 50)
  }

  private async flushBatch(): Promise<void> {
    for (const [documentId, operations] of this.messageQueue) {
      if (operations.length > 0) {
        await this.broadcastOperations(documentId, operations)
        this.messageQueue.set(documentId, [])
      }
    }
  }

  // Connection health monitoring
  async monitorConnections(): Promise<void> {
    setInterval(() => {
      for (const [userId, ws] of this.connections) {
        if (ws.readyState !== WebSocket.OPEN) {
          this.cleanupConnection(userId)
        } else {
          // Send ping to check connectivity
          ws.ping()
        }
      }
    }, 30000) // Every 30 seconds
  }
}
```

## 8. Integration Patterns for AI Services

### 8.1 AI Service Architecture

```typescript
// AI service interface
interface AIService {
  summarize(content: string): Promise<string>
  generateTags(content: string): Promise<string[]>
  improveContent(content: string, instruction: string): Promise<string>
  checkFacts(content: string): Promise<FactCheck[]>
  translateContent(content: string, targetLang: string): Promise<string>
  analyzeReadability(content: string): Promise<ReadabilityScore>
  extractConcepts(content: string): Promise<Concept[]>
  recommendDocuments(userId: string, context: string): Promise<Document[]>
}

// AI service implementation with multiple providers
class AIServiceManager {
  private providers = new Map<string, AIProvider>()
  private fallbackChain: string[] = ['openai', 'anthropic', 'local']

  constructor() {
    this.providers.set('openai', new OpenAIProvider())
    this.providers.set('anthropic', new AnthropicProvider())
    this.providers.set('local', new LocalModelProvider())
  }

  async summarize(content: string): Promise<string> {
    return this.executeWithFallback('summarize', [content])
  }

  private async executeWithFallback(
    method: string,
    args: any[]
  ): Promise<any> {
    for (const providerName of this.fallbackChain) {
      try {
        const provider = this.providers.get(providerName)
        return await provider[method](...args)
      } catch (error) {
        console.error(`${providerName} failed:`, error)
        // Try next provider
      }
    }
    throw new Error('All AI providers failed')
  }
}

// OpenAI provider implementation
class OpenAIProvider implements AIProvider {
  private client: OpenAI

  async summarize(content: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following content in 2-3 sentences, focusing on key insights and main points.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    return response.choices[0].message.content
  }

  async generateTags(content: string): Promise<string[]> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Extract 3-8 relevant tags from the content. Return only the tags as a comma-separated list.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    })

    return response.choices[0].message.content
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
  }
}
```

### 8.2 AI Pipeline Architecture

```typescript
// AI processing pipeline
class AIProcessingPipeline {
  private stages: AIStage[] = []
  private queue: Queue<ProcessingJob>

  constructor() {
    this.setupPipeline()
    this.queue = new Queue('ai-processing', {
      redis: { host: 'redis-host' },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50
      }
    })
  }

  private setupPipeline(): void {
    this.stages = [
      new PreprocessingStage(),
      new SummarizationStage(),
      new TaggingStage(),
      new ConceptExtractionStage(),
      new QualityAnalysisStage(),
      new LinkSuggestionStage(),
      new PostprocessingStage()
    ]
  }

  async processDocument(documentId: string): Promise<AIInsights> {
    const job = await this.queue.add('process-document', {
      documentId,
      stages: this.stages.map(s => s.name)
    })

    return job.finished()
  }

  // Worker process for AI pipeline
  async processJob(job: Job<ProcessingJob>): Promise<AIInsights> {
    const { documentId } = job.data
    const document = await this.getDocument(documentId)

    let context = {
      document,
      insights: {} as AIInsights
    }

    // Execute stages sequentially
    for (const stage of this.stages) {
      try {
        context = await stage.process(context)
        await job.progress((stage.order / this.stages.length) * 100)
      } catch (error) {
        console.error(`Stage ${stage.name} failed:`, error)
        // Continue with next stage or fail based on criticality
      }
    }

    // Save insights to database
    await this.saveInsights(documentId, context.insights)
    return context.insights
  }
}

// Individual processing stages
class SummarizationStage implements AIStage {
  name = 'summarization'
  order = 2

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    const { document } = context

    try {
      const summary = await aiService.summarize(document.contentText)
      context.insights.summary = summary
    } catch (error) {
      // Log error but continue pipeline
      console.error('Summarization failed:', error)
    }

    return context
  }
}

class TaggingStage implements AIStage {
  name = 'tagging'
  order = 3

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    const { document } = context

    try {
      const suggestedTags = await aiService.generateTags(document.contentText)
      context.insights.suggestedTags = suggestedTags
    } catch (error) {
      console.error('Tagging failed:', error)
    }

    return context
  }
}
```

## 9. Event-Driven Architecture

### 9.1 Event System Design

```typescript
// Event types
interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  payload: any
  metadata: EventMetadata
  timestamp: Date
  version: number
}

interface EventMetadata {
  userId?: string
  traceId: string
  source: string
  correlationId?: string
}

// Event definitions
enum EventType {
  // Document events
  DOCUMENT_CREATED = 'document.created',
  DOCUMENT_UPDATED = 'document.updated',
  DOCUMENT_DELETED = 'document.deleted',
  DOCUMENT_PUBLISHED = 'document.published',
  DOCUMENT_ARCHIVED = 'document.archived',

  // Collaboration events
  USER_JOINED_DOCUMENT = 'collaboration.user_joined',
  USER_LEFT_DOCUMENT = 'collaboration.user_left',
  OPERATION_APPLIED = 'collaboration.operation_applied',
  COMMENT_ADDED = 'collaboration.comment_added',

  // AI events
  AI_PROCESSING_STARTED = 'ai.processing_started',
  AI_PROCESSING_COMPLETED = 'ai.processing_completed',
  AI_INSIGHTS_UPDATED = 'ai.insights_updated',

  // User events
  USER_REGISTERED = 'user.registered',
  USER_PROFILE_UPDATED = 'user.profile_updated',

  // Workspace events
  WORKSPACE_CREATED = 'workspace.created',
  USER_INVITED = 'workspace.user_invited',
  USER_JOINED_WORKSPACE = 'workspace.user_joined'
}

// Event bus interface
interface EventBus {
  publish(event: DomainEvent): Promise<void>
  subscribe(eventType: string, handler: EventHandler): void
  unsubscribe(eventType: string, handler: EventHandler): void
}

// Event handler interface
interface EventHandler {
  handle(event: DomainEvent): Promise<void>
  canHandle(event: DomainEvent): boolean
  priority: number
}

// Event bus implementation with Redis
class RedisEventBus implements EventBus {
  private redis: Redis
  private subscribers = new Map<string, EventHandler[]>()

  async publish(event: DomainEvent): Promise<void> {
    // Store event in event store
    await this.storeEvent(event)

    // Publish to Redis pub/sub
    await this.redis.publish(
      `events:${event.type}`,
      JSON.stringify(event)
    )

    // Publish to wildcard channels
    const parts = event.type.split('.')
    for (let i = 1; i <= parts.length; i++) {
      const pattern = parts.slice(0, i).join('.') + '.*'
      await this.redis.publish(`events:${pattern}`, JSON.stringify(event))
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, [])
      // Subscribe to Redis channel
      this.redis.subscribe(`events:${eventType}`)
    }

    const handlers = this.subscribers.get(eventType)!
    handlers.push(handler)
    handlers.sort((a, b) => b.priority - a.priority)
  }

  private async handleRedisMessage(channel: string, message: string): Promise<void> {
    const event: DomainEvent = JSON.parse(message)
    const eventType = channel.replace('events:', '')
    const handlers = this.subscribers.get(eventType) || []

    // Execute handlers in parallel with error isolation
    await Promise.allSettled(
      handlers.map(async handler => {
        if (handler.canHandle(event)) {
          try {
            await handler.handle(event)
          } catch (error) {
            console.error(`Handler ${handler.constructor.name} failed:`, error)
            // Optionally add to dead letter queue
            await this.handleFailedEvent(event, handler, error)
          }
        }
      })
    )
  }
}
```

### 9.2 Event Handlers

```typescript
// Document event handlers
class DocumentIndexingHandler implements EventHandler {
  priority = 100

  canHandle(event: DomainEvent): boolean {
    return [
      EventType.DOCUMENT_CREATED,
      EventType.DOCUMENT_UPDATED,
      EventType.DOCUMENT_PUBLISHED
    ].includes(event.type as EventType)
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case EventType.DOCUMENT_CREATED:
      case EventType.DOCUMENT_UPDATED:
        await this.indexDocument(event.aggregateId)
        break
      case EventType.DOCUMENT_PUBLISHED:
        await this.updateSearchIndex(event.aggregateId)
        break
    }
  }

  private async indexDocument(documentId: string): Promise<void> {
    const document = await documentService.getById(documentId)
    await searchService.indexDocument(document)
  }
}

// AI processing handler
class AIProcessingHandler implements EventHandler {
  priority = 80

  canHandle(event: DomainEvent): boolean {
    return [
      EventType.DOCUMENT_CREATED,
      EventType.DOCUMENT_UPDATED
    ].includes(event.type as EventType)
  }

  async handle(event: DomainEvent): Promise<void> {
    // Trigger AI processing asynchronously
    await aiProcessingQueue.add('process-document', {
      documentId: event.aggregateId,
      reason: event.type
    })
  }
}

// Notification handler
class NotificationHandler implements EventHandler {
  priority = 50

  canHandle(event: DomainEvent): boolean {
    return [
      EventType.COMMENT_ADDED,
      EventType.USER_INVITED,
      EventType.DOCUMENT_PUBLISHED
    ].includes(event.type as EventType)
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case EventType.COMMENT_ADDED:
        await this.notifyDocumentCollaborators(event)
        break
      case EventType.USER_INVITED:
        await this.sendInvitationEmail(event)
        break
      case EventType.DOCUMENT_PUBLISHED:
        await this.notifySubscribers(event)
        break
    }
  }

  private async notifyDocumentCollaborators(event: DomainEvent): Promise<void> {
    const comment = event.payload as Comment
    const collaborators = await documentService.getCollaborators(comment.documentId)

    for (const user of collaborators) {
      if (user.id !== event.metadata.userId) {
        await notificationService.send({
          userId: user.id,
          type: 'comment_added',
          title: 'New comment on document',
          message: `${event.metadata.userId} commented on ${comment.document.title}`,
          data: { documentId: comment.documentId, commentId: comment.id }
        })
      }
    }
  }
}

// Analytics handler
class AnalyticsHandler implements EventHandler {
  priority = 10

  canHandle(event: DomainEvent): boolean {
    return true // Track all events
  }

  async handle(event: DomainEvent): Promise<void> {
    await analyticsService.track({
      eventType: event.type,
      userId: event.metadata.userId,
      properties: {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        ...event.payload
      },
      timestamp: event.timestamp
    })
  }
}
```

## 10. Performance Targets & Monitoring

### 10.1 Performance Targets

```typescript
// Performance SLA definitions
const PERFORMANCE_TARGETS = {
  api: {
    // HTTP API response times
    'GET /api/documents': { p95: 200, p99: 500 }, // ms
    'POST /api/documents': { p95: 300, p99: 800 },
    'PUT /api/documents/*': { p95: 250, p99: 600 },
    'GET /api/search': { p95: 300, p99: 1000 },
    'POST /api/ai/*': { p95: 2000, p99: 5000 },

    // Overall API targets
    availability: 99.9, // %
    errorRate: 0.1 // %
  },

  realtime: {
    // WebSocket performance
    connectionTime: 100, // ms
    operationSync: 100, // ms
    presenceUpdate: 50, // ms
    messageLatency: 30 // ms
  },

  database: {
    // Database query performance
    simpleQuery: 10, // ms
    complexQuery: 100, // ms
    searchQuery: 200, // ms
    analyticsQuery: 500, // ms

    // Connection metrics
    connectionPoolUtilization: 80, // %
    connectionTime: 50 // ms
  },

  frontend: {
    // Core Web Vitals
    fcp: 1500, // First Contentful Paint (ms)
    lcp: 2500, // Largest Contentful Paint (ms)
    tti: 3500, // Time to Interactive (ms)
    cls: 0.1, // Cumulative Layout Shift
    fid: 100, // First Input Delay (ms)

    // Bundle sizes
    initialBundle: 200, // KB
    totalBundle: 500, // KB
    chunkSize: 50 // KB
  }
}
```

### 10.2 Monitoring & Alerting

```typescript
// Monitoring service
class MonitoringService {
  private metrics: MetricsCollector
  private alerts: AlertManager

  // Performance monitoring
  async recordAPIMetric(
    endpoint: string,
    duration: number,
    statusCode: number
  ): Promise<void> {
    await this.metrics.histogram('api_request_duration', duration, {
      endpoint,
      status_code: statusCode.toString()
    })

    await this.metrics.counter('api_request_total', {
      endpoint,
      status_code: statusCode.toString()
    })

    // Check SLA compliance
    const target = PERFORMANCE_TARGETS.api[endpoint]
    if (target && duration > target.p95) {
      await this.alerts.warn(`API ${endpoint} slow response: ${duration}ms`)
    }
  }

  // Real-time monitoring
  async recordWebSocketMetric(
    event: string,
    duration: number,
    userId: string
  ): Promise<void> {
    await this.metrics.histogram('websocket_event_duration', duration, {
      event,
      user_id: userId
    })

    // Check real-time targets
    const target = PERFORMANCE_TARGETS.realtime[event]
    if (target && duration > target) {
      await this.alerts.error(`WebSocket ${event} exceeded target: ${duration}ms`)
    }
  }

  // Health checks
  async performHealthChecks(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkElasticsearch(),
      this.checkAIServices(),
      this.checkExternalAPIs()
    ])

    const results = checks.map((check, index) => ({
      name: ['database', 'redis', 'elasticsearch', 'ai', 'external'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason
    }))

    const overallStatus = results.every(r => r.status === 'healthy')
      ? 'healthy' : 'degraded'

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date()
    }
  }
}

// Alert definitions
const ALERT_RULES = {
  // High priority alerts
  critical: [
    {
      name: 'API Error Rate High',
      condition: 'api_error_rate > 5%',
      duration: '2m',
      action: 'page_on_call'
    },
    {
      name: 'Database Connection Failed',
      condition: 'database_health != healthy',
      duration: '30s',
      action: 'page_on_call'
    },
    {
      name: 'WebSocket Connections Down',
      condition: 'websocket_connections < 10',
      duration: '1m',
      action: 'page_on_call'
    }
  ],

  // Warning alerts
  warning: [
    {
      name: 'API Response Time High',
      condition: 'api_p95_latency > 1000ms',
      duration: '5m',
      action: 'slack_notification'
    },
    {
      name: 'AI Service Degraded',
      condition: 'ai_success_rate < 90%',
      duration: '3m',
      action: 'slack_notification'
    },
    {
      name: 'Search Latency High',
      condition: 'search_p95_latency > 2000ms',
      duration: '5m',
      action: 'slack_notification'
    }
  ]
}
```

This comprehensive backend API architecture provides:

1. **Scalable GraphQL schema** with proper entity relationships and real-time subscriptions
2. **Hybrid WebSocket/HTTP architecture** for optimal real-time collaboration performance
3. **Multi-layered authentication/authorization** with JWT, RBAC, and fine-grained permissions
4. **Optimized database design** with PostgreSQL, Redis, and ElasticSearch for different use cases
5. **API versioning strategy** ensuring backwards compatibility and smooth migrations
6. **Advanced security middleware** with rate limiting, input validation, and comprehensive security headers
7. **Multi-level caching and performance optimization** targeting sub-500ms response times
8. **Robust AI integration patterns** with fallback chains and async processing pipelines
9. **Event-driven architecture** for scalable notifications and workflows
10. **Comprehensive monitoring and alerting** with performance targets and SLA tracking

The architecture is designed to handle high-throughput collaborative editing, real-time features, and AI-powered knowledge intelligence while maintaining security, performance, and maintainability standards suitable for a production knowledge management platform.

Key files created:
- `/Users/jokkeruokolainen/Documents/Solita/GenAI/IDE/ouroboros-demo/backend-api-architecture.md`