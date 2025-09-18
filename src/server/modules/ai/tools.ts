import { prisma } from '@/lib/db/prisma'
import { getSearchService } from '@/server/modules/search/search.service'
import { templateService } from '@/server/modules/templates/template.service'
import { aclService } from '@/server/modules/organization/acl.service'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'

type JsonSchema = Record<string, any>

export interface AgentToolSpec {
  name: string
  description: string
  parameters: JsonSchema
  execute: (args: any, ctx: { userId: string; workspaceId?: string }) => Promise<any>
}

async function ensureAccess(userId: string, workspaceId: string | undefined, action: OrgPermission | string, resourceType: OrgResourceType, resourceId?: string) {
  if (!workspaceId) return // allow in dev when workspace is not scoped yet
  const ok = await aclService.checkAccess({ userId, workspaceId, resourceType, action, ...(resourceId ? { resourceId } : {}) })
  if (!ok) {
    const e: any = new Error('Forbidden')
    e.status = 403
    throw e
  }
}

export function buildWorkspaceAgentTools(): AgentToolSpec[] {
  const tools: AgentToolSpec[] = []

  tools.push({
    name: 'search_workspace_documents',
    description: 'Search workspace knowledge/documents by query with optional filters.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['query'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_READ, OrgResourceType.WORKSPACE)
      const svc = getSearchService()
      const res = await svc.search({
        query: String(args.query ?? ''),
        workspaceId: ctx.workspaceId ?? '',
        size: Math.min(Math.max(Number(args.limit ?? 10), 1), 50),
        filters: args.tags && Array.isArray(args.tags) && args.tags.length ? { tags: args.tags } : undefined,
      })
      return res.hits.items.map((hit) => ({
        id: hit.document.id,
        title: hit.document.title,
        path: hit.document.path,
        snippet: hit.highlights?.contentText?.[0] ?? hit.document.excerpt ?? '',
        collectionId: hit.document.collection?.id ?? null,
        tags: (hit.document.tags ?? []).map((t: any) => t.name),
      }))
    },
  })

  tools.push({
    name: 'list_collections',
    description: 'List collections in the current workspace.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.WORKSPACE_MANAGE, OrgResourceType.WORKSPACE)
      const rows = await prisma.collection.findMany({
        where: { workspaceId: ctx.workspaceId ?? '' },
        orderBy: { name: 'asc' },
        take: Math.min(Math.max(Number(args.limit ?? 50), 1), 200),
        select: { id: true, name: true, parentId: true, description: true },
      })
      return rows
    },
  })

  tools.push({
    name: 'search_collections',
    description: 'Search collections by name (case-insensitive substring match).',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
      required: ['q'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.WORKSPACE_MANAGE, OrgResourceType.WORKSPACE)
      const rows = await prisma.collection.findMany({
        where: { workspaceId: ctx.workspaceId ?? '', name: { contains: String(args.q ?? ''), mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: Math.min(Math.max(Number(args.limit ?? 50), 1), 200),
        select: { id: true, name: true, parentId: true, description: true },
      })
      return rows
    },
  })

  tools.push({
    name: 'search_templates',
    description: 'Search templates by title/keywords in this workspace.',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      },
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:read', OrgResourceType.WORKSPACE)
      const { templates } = await templateService.list(ctx.workspaceId ?? '')
      const q = String(args.q ?? '').toLowerCase()
      const all = templates.map((t: any) => ({ id: t.id, title: t.title, updatedAt: t.updatedAt }))
      const filtered = q ? all.filter((t) => (t.title ?? '').toLowerCase().includes(q)) : all
      return filtered.slice(0, Math.min(Math.max(Number(args.limit ?? 10), 1), 50))
    },
  })

  tools.push({
    name: 'suggest_tags',
    description: 'Suggest tags in the workspace by prefix or from content.',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      },
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.TAG_UPDATE, OrgResourceType.WORKSPACE)
      const q = String(args.q ?? '')
      const rows = await prisma.tag.findMany({
        where: { workspaceId: ctx.workspaceId ?? '', name: { contains: q, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: Math.min(Math.max(Number(args.limit ?? 10), 1), 50),
        select: { id: true, name: true, color: true },
      })
      return rows
    },
  })

  tools.push({
    name: 'create_document',
    description: 'Create a new document in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        collectionId: { type: 'string', nullable: true },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'content'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('create_document', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_CREATE, OrgResourceType.WORKSPACE)
      const created = await prisma.knowledge.create({
        data: {
          workspaceId: ctx.workspaceId ?? '',
          authorId: ctx.userId,
          title: String(args.title),
          content: String(args.content),
          isTemplate: false,
          ...(args.collectionId ? { collectionId: String(args.collectionId) } : {}),
          metadata: {},
        },
        select: { id: true, title: true },
      })
      // Link tags if provided
      if (Array.isArray(args.tags) && args.tags.length) {
        const tagNames: string[] = args.tags.map((t: any) => String(t))
        for (const name of tagNames) {
          const tag = await prisma.tag.upsert({
            where: { workspaceId_name: { workspaceId: ctx.workspaceId ?? '', name } },
            create: { workspaceId: ctx.workspaceId ?? '', name },
            update: {},
          })
          await prisma.knowledgeTag.create({ data: { knowledgeId: created.id, tagId: tag.id } })
        }
      }
      return { id: created.id, title: created.title }
    },
  })

  tools.push({
    name: 'create_template',
    description: 'Create a new template in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        collectionId: { type: 'string', nullable: true },
        version: { type: 'string', default: '1.0.0' },
      },
      required: ['title', 'content'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('create_template', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:create', OrgResourceType.WORKSPACE)
      const res = await templateService.create({
        workspaceId: ctx.workspaceId ?? '',
        authorId: ctx.userId,
        title: String(args.title),
        content: String(args.content),
        ...(args.collectionId ? { collectionId: String(args.collectionId) } : {}),
        metadata: {},
      })
      return { id: res.id, workspaceId: res.workspaceId }
    },
  })

  tools.push({
    name: 'list_recent_documents',
    description: 'List recently updated documents in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      },
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_READ, OrgResourceType.WORKSPACE)
      const rows = await prisma.knowledge.findMany({
        where: { workspaceId: ctx.workspaceId ?? '', isTemplate: false },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(Math.max(Number(args.limit ?? 10), 1), 50),
        select: { id: true, title: true, updatedAt: true, collectionId: true },
      })
      return rows
    },
  })

  tools.push({
    name: 'get_document',
    description: 'Fetch a document by id and return title, path, tags, and excerpt.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_READ, OrgResourceType.KNOWLEDGE, String(args.id))
      const k = await prisma.knowledge.findUnique({ where: { id: String(args.id) }, select: { id: true, title: true, content: true, collectionId: true, updatedAt: true } })
      if (!k) return null
      return k
    },
  })

  tools.push({
    name: 'update_document',
    description: 'Update a document title or content.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('update_document', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_UPDATE, OrgResourceType.KNOWLEDGE, String(args.id))
      const updated = await prisma.knowledge.update({ where: { id: String(args.id) }, data: { ...(args.title ? { title: String(args.title) } : {}), ...(args.content ? { content: String(args.content) } : {}) }, select: { id: true, title: true } })
      return updated
    },
  })

  tools.push({
    name: 'move_document',
    description: 'Move a document to a different collection.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        collectionId: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'collectionId'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('move_document', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_UPDATE, OrgResourceType.KNOWLEDGE, String(args.id))
      const updated = await prisma.knowledge.update({ where: { id: String(args.id) }, data: { collectionId: String(args.collectionId) }, select: { id: true, title: true, collectionId: true } })
      return updated
    },
  })

  tools.push({
    name: 'delete_document',
    description: 'Delete a document permanently. Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'confirm'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('delete_document', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_DELETE, OrgResourceType.KNOWLEDGE, String(args.id))
      await prisma.knowledge.delete({ where: { id: String(args.id) } })
      return { ok: true }
    },
  })

  tools.push({
    name: 'create_tag',
    description: 'Create a tag in the workspace if it does not exist.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string' }, color: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('create_tag', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.TAG_UPDATE, OrgResourceType.WORKSPACE)
      const tag = await prisma.tag.upsert({ where: { workspaceId_name: { workspaceId: ctx.workspaceId ?? '', name: String(args.name) } }, create: { workspaceId: ctx.workspaceId ?? '', name: String(args.name), color: args.color ? String(args.color) : null }, update: { color: args.color ? String(args.color) : null } })
      return { id: tag.id, name: tag.name, color: tag.color }
    },
  })

  tools.push({
    name: 'attach_tags',
    description: 'Attach tags to a document (creating tags as needed).',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, confirm: { type: 'boolean', default: false } },
      required: ['id', 'tags'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('attach_tags', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_UPDATE, OrgResourceType.KNOWLEDGE, String(args.id))
      const names: string[] = Array.isArray(args.tags) ? args.tags.map((t: any) => String(t)) : []
      for (const name of names) {
        const tag = await prisma.tag.upsert({ where: { workspaceId_name: { workspaceId: ctx.workspaceId ?? '', name } }, create: { workspaceId: ctx.workspaceId ?? '', name }, update: {} })
        await prisma.knowledgeTag.upsert({ where: { knowledgeId_tagId: { knowledgeId: String(args.id), tagId: tag.id } }, create: { knowledgeId: String(args.id), tagId: tag.id }, update: {} })
      }
      return { ok: true, attached: names.length }
    },
  })

  return tools
}

function requireConfirmation(tool: string, args: any) {
  if (!args || args.confirm !== true) {
    const e: any = new Error(`Confirmation required for ${tool}. Retry with confirm=true after summarizing the change to the user.`)
    e.status = 412
    throw e
  }
}
