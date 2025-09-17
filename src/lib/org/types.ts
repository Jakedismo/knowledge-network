import { z } from 'zod'

export const Id = z.string().min(1)

export const Workspace = z.object({
  id: Id,
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  settings: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Workspace = z.infer<typeof Workspace>

export const ACL = z.object({
  allow: z
    .object({ roles: z.array(z.string()).default([]), users: z.array(z.string()).default([]) })
    .default({ roles: [], users: [] }),
  deny: z
    .object({ roles: z.array(z.string()).default([]), users: z.array(z.string()).default([]) })
    .default({ roles: [], users: [] }),
})
export type ACL = z.infer<typeof ACL>

const CollectionNodeBase = z.object({
  id: Id,
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
  workspaceId: Id,
  parentId: Id.nullable(),
  metadata: z
    .object({
      acl: ACL.optional(),
    })
    .passthrough()
    .default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type CollectionNode = z.infer<typeof CollectionNodeBase> & { children: CollectionNode[] }
export const CollectionNode: z.ZodType<CollectionNode> = z.lazy(() =>
  CollectionNodeBase.extend({ children: z.array(CollectionNode).default([]) }),
)

export const Tag = z.object({
  id: Id,
  name: z.string().min(1),
  color: z.string().optional(),
  usageCount: z.number().int().nonnegative().default(0),
  workspaceId: Id,
  createdAt: z.date(),
})
export type Tag = z.infer<typeof Tag>

export const KnowledgeMetadataSchema = z.object({
  id: Id,
  workspaceId: Id,
  knowledgeType: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  // JSON schema expressed via zod shape descriptor (stored as JSON-friendly)
  zodJson: z.record(z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type KnowledgeMetadataSchema = z.infer<typeof KnowledgeMetadataSchema>

export const PermissionAction = z.enum(['create', 'read', 'update', 'delete', 'manage'])
export type PermissionAction = z.infer<typeof PermissionAction>

export const PermissionResource = z.enum(['workspace', 'collection', 'knowledge', 'tag'])
export type PermissionResource = z.infer<typeof PermissionResource>

export interface EffectivePermissionInput {
  userId: string
  workspaceId: string
  resource: PermissionResource
  action: PermissionAction
  resourceId?: string | null
  resourceAcl?: ACL | null
  parentAclChain?: ACL[]
}

export type CollectionsTree = CollectionNode[]
