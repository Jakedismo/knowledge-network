// Core entity types for the Knowledge Network application

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'contributor'

export interface Workspace {
  id: string
  name: string
  description?: string
  slug: string
  ownerId: string
  isPublic: boolean
  settings: WorkspaceSettings
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceSettings {
  allowPublicRead: boolean
  allowPublicWrite: boolean
  requireApproval: boolean
  enableAI: boolean
  enableComments: boolean
  enableVersioning: boolean
}

export interface Document {
  id: string
  title: string
  content: DocumentContent
  slug: string
  workspaceId: string
  authorId: string
  status: DocumentStatus
  tags: string[]
  metadata: DocumentMetadata
  permissions: DocumentPermissions
  version: number
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export type DocumentStatus = 'draft' | 'review' | 'published' | 'archived'

export interface DocumentContent {
  blocks: ContentBlock[]
  version: string
  checksum: string
}

export interface ContentBlock {
  id: string
  type: BlockType
  data: Record<string, unknown>
  order: number
}

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'code'
  | 'quote'
  | 'image'
  | 'video'
  | 'embed'
  | 'table'
  | 'math'

export interface DocumentMetadata {
  readTime: number
  wordCount: number
  lastEditor?: string
  templateId?: string
  aiSummary?: string
  relatedDocuments: string[]
}

export interface DocumentPermissions {
  read: string[]
  write: string[]
  admin: string[]
  publicRead: boolean
  publicWrite: boolean
}

export interface Collection {
  id: string
  name: string
  description?: string
  workspaceId: string
  parentId?: string
  type: CollectionType
  icon?: string
  color?: string
  documents: string[]
  children: string[]
  createdAt: Date
  updatedAt: Date
}

export type CollectionType = 'folder' | 'tag' | 'smart'

export interface Comment {
  id: string
  documentId: string
  authorId: string
  content: string
  blockId?: string
  selection?: TextSelection
  parentId?: string
  resolved: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TextSelection {
  start: number
  end: number
  text: string
}

export interface Activity {
  id: string
  type: ActivityType
  actorId: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export type ActivityType =
  | 'document.created'
  | 'document.updated'
  | 'document.published'
  | 'document.deleted'
  | 'comment.created'
  | 'comment.resolved'
  | 'user.joined'
  | 'workspace.created'

export interface SearchResult {
  id: string
  type: 'document' | 'collection' | 'user'
  title: string
  snippet: string
  score: number
  highlights: string[]
  metadata: Record<string, unknown>
}

export interface AIInsight {
  id: string
  type: InsightType
  documentId?: string
  workspaceId: string
  title: string
  description: string
  data: Record<string, unknown>
  score: number
  createdAt: Date
}

export type InsightType =
  | 'duplicate_content'
  | 'outdated_content'
  | 'missing_links'
  | 'knowledge_gap'
  | 'trending_topic'
  | 'expert_recommendation'

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Form types
export interface CreateDocumentInput {
  title: string
  workspaceId: string
  collectionId?: string
  templateId?: string
  content?: DocumentContent
  tags?: string[]
}

export interface UpdateDocumentInput {
  title?: string
  content?: DocumentContent
  status?: DocumentStatus
  tags?: string[]
  metadata?: Partial<DocumentMetadata>
}

export interface CreateWorkspaceInput {
  name: string
  description?: string
  slug: string
  isPublic?: boolean
  settings?: Partial<WorkspaceSettings>
}

// Real-time collaboration types
export interface CollaborationEvent {
  type: CollaborationEventType
  documentId: string
  userId: string
  data: Record<string, unknown>
  timestamp: Date
}

export type CollaborationEventType =
  | 'user_joined'
  | 'user_left'
  | 'cursor_moved'
  | 'content_changed'
  | 'selection_changed'
  | 'comment_added'

export interface UserPresence {
  userId: string
  user: Pick<User, 'id' | 'name' | 'avatar'>
  cursor?: CursorPosition
  selection?: TextSelection
  lastSeen: Date
}

export interface CursorPosition {
  blockId: string
  offset: number
}

// Configuration types
export interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  features: {
    ai: boolean
    realtime: boolean
    offline: boolean
    analytics: boolean
  }
  ui: {
    theme: 'light' | 'dark' | 'system'
    density: 'compact' | 'comfortable' | 'spacious'
    animations: boolean
  }
}