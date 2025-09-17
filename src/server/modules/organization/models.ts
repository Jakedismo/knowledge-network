export type OrgId = string

export enum OrgResourceType {
  WORKSPACE = 'WORKSPACE',
  COLLECTION = 'COLLECTION',
  KNOWLEDGE = 'KNOWLEDGE',
}

export enum OrgPermission {
  WORKSPACE_ADMIN = 'workspace:admin',
  WORKSPACE_MANAGE = 'workspace:manage',
  COLLECTION_CREATE = 'collection:create',
  COLLECTION_MANAGE = 'collection:manage',
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  TAG_CREATE = 'tag:create',
  TAG_UPDATE = 'tag:update',
}

export interface AccessCheck {
  userId: string
  workspaceId: string
  resourceType: OrgResourceType
  action: OrgPermission | string
  resourceId?: string
}

export interface MoveCollectionInput {
  id: string
  parentId: string | null
  workspaceId: string
}

export interface CreateCollectionInput {
  name: string
  workspaceId: string
  parentId?: string | null
  description?: string | null
  color?: string | null
  icon?: string | null
  type?: 'FOLDER' | 'SMART'
}

export interface UpdateCollectionInput {
  id: string
  name?: string
  description?: string | null
  color?: string | null
  icon?: string | null
}

export interface CreateWorkspaceInput {
  name: string
  description?: string | null
  ownerId: string
  settings?: Record<string, unknown>
}

export interface UpdateWorkspaceInput {
  id: string
  name?: string
  description?: string | null
  settings?: Record<string, unknown>
  isActive?: boolean
}

export interface TagSuggestParams {
  workspaceId: string
  query?: string
  contentText?: string
  limit?: number
}
