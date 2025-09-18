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
      validateLimits(args)
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
        path: `/knowledge/${hit.document.id}`,
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
      validateLimits(args)
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
      validateLimits(args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:read', OrgResourceType.WORKSPACE)
      const { templates } = await templateService.list(ctx.workspaceId ?? '')
      const q = String(args.q ?? '').toLowerCase()
      const all = templates.map((t: any) => ({
        id: t.id,
        title: t.title,
        updatedAt: t.updatedAt,
        kind: 'template',
        path: `/knowledge/${t.id}`,
        tags: Array.isArray((t as any).metadata?.tags) ? (t as any).metadata.tags : undefined,
        categories: Array.isArray((t as any).metadata?.categories) ? (t as any).metadata.categories : undefined,
      }))
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
      validateLimits(args)
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
      validateLimits(args)
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
      return { id: created.id, title: created.title, path: `/knowledge/${created.id}` }
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
      validateLimits(args)
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
      return { id: res.id, workspaceId: res.workspaceId, path: `/knowledge/${res.id}`, kind: 'template' }
    },
  })

  tools.push({
    name: 'update_template',
    description: 'Update a template\'s title/content/metadata. Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        metadata: { type: 'object' },
        collectionId: { type: 'string', nullable: true },
        changeSummary: { type: 'string' },
        branchName: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      validateLimits(args)
      requireConfirmation('update_template', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:update', OrgResourceType.KNOWLEDGE, String(args.id))
      const res = await templateService.update({
        id: String(args.id),
        title: args.title ? String(args.title) : undefined,
        content: args.content ? String(args.content) : undefined,
        metadata: args.metadata ? (args.metadata as any) : undefined,
        collectionId: args.collectionId !== undefined ? String(args.collectionId) : undefined,
        changeSummary: args.changeSummary ? String(args.changeSummary) : undefined,
        branchName: args.branchName ? String(args.branchName) : undefined,
        authorId: ctx.userId,
      })
      return { id: res.id, path: `/knowledge/${res.id}`, kind: 'template' }
    },
  })

  tools.push({
    name: 'list_template_versions',
    description: 'List versions for a template (optionally by branch).',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        branchName: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:update', OrgResourceType.KNOWLEDGE, String(args.id))
      const rows = await templateService.listVersions(String(args.id), args.branchName ? String(args.branchName) : undefined)
      return rows
    },
  })

  tools.push({
    name: 'commit_template_version',
    description: 'Commit a new version of a template. Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        content: { type: 'string' },
        changeSummary: { type: 'string' },
        branchName: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'content', 'confirm'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      validateLimits(args)
      requireConfirmation('commit_template_version', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:update', OrgResourceType.KNOWLEDGE, String(args.id))
      await templateService.commitVersion({
        templateId: String(args.id),
        authorId: ctx.userId,
        content: String(args.content),
        changeSummary: args.changeSummary ? String(args.changeSummary) : undefined,
        branchName: args.branchName ? String(args.branchName) : undefined,
      })
      return { ok: true }
    },
  })

  tools.push({
    name: 'publish_template',
    description: 'Publish a template to marketplace with visibility. Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
        title: { type: 'string' },
        description: { type: 'string' },
        categories: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'visibility', 'title', 'confirm'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      validateLimits(args)
      requireConfirmation('publish_template', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:publish', OrgResourceType.KNOWLEDGE, String(args.id))
      const res = await templateService.publish({
        templateId: String(args.id),
        workspaceId: ctx.workspaceId ?? '',
        creatorId: ctx.userId,
        visibility: String(args.visibility) as any,
        title: String(args.title),
        description: args.description ? String(args.description) : undefined,
        categories: Array.isArray(args.categories) ? (args.categories as string[]) : undefined,
        tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
      })
      return { id: res.id, status: 'PUBLISHED', visibility: res.visibility, kind: 'template' }
    },
  })

  tools.push({
    name: 'share_template',
    description: 'Share a template by granting permissions to users or roles. Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        grants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['USER', 'ROLE'] },
              subjectId: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
            },
            required: ['kind', 'subjectId', 'permissions'],
            additionalProperties: false,
          },
        },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'grants', 'confirm'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      requireConfirmation('share_template', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:share', OrgResourceType.KNOWLEDGE, String(args.id))
      await templateService.share({
        workspaceId: ctx.workspaceId ?? '',
        templateId: String(args.id),
        grants: (args.grants as Array<any>).map((g) => ({ kind: g.kind, subjectId: String(g.subjectId), permissions: g.permissions as any })),
      })
      return { ok: true }
    },
  })

  tools.push({
    name: 'apply_template',
    description: 'Instantiate a template as a new document. Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        collectionId: { type: 'string' },
        values: { type: 'object' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'confirm'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      validateLimits(args)
      requireConfirmation('apply_template', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:use', OrgResourceType.KNOWLEDGE, String(args.id))
      const created = await templateService.apply({
        templateId: String(args.id),
        target: {
          workspaceId: ctx.workspaceId ?? '',
          authorId: ctx.userId,
          collectionId: args.collectionId ? String(args.collectionId) : undefined,
          title: args.title ? String(args.title) : undefined,
        },
        values: (args.values as any) ?? {},
      })
      return { id: created.id, path: `/knowledge/${created.id}` }
    },
  })

  tools.push({
    name: 'apply_template_from_context',
    description: 'Instantiate a template using current context (selectionText, tags, route, documentId). Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        collectionId: { type: 'string' },
        values: { type: 'object' },
        selectionText: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        route: { type: 'string' },
        documentId: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'confirm'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      validateLimits(args)
      requireConfirmation('apply_template_from_context', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:use', OrgResourceType.KNOWLEDGE, String(args.id))
      const values: Record<string, any> = { ...(args.values as any) }
      if (args.selectionText && !values.summary) values.summary = String(args.selectionText)
      if (Array.isArray(args.tags) && !values.tags) values.tags = args.tags
      if (ctx.workspaceId && !values.workspace) values.workspace = ctx.workspaceId
      const created = await templateService.apply({
        templateId: String(args.id),
        target: {
          workspaceId: ctx.workspaceId ?? '',
          authorId: ctx.userId,
          collectionId: args.collectionId ? String(args.collectionId) : undefined,
          title: args.title ? String(args.title) : undefined,
        },
        values,
      })
      return { id: created.id, path: `/knowledge/${created.id}` }
    },
  })

  tools.push({
    name: 'update_template_metadata',
    description: 'Update only template metadata fields. Requires confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        metadata: { type: 'object' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'metadata', 'confirm'],
      additionalProperties: false,
    },
    async execute(args, ctx) {
      validateLimits(args)
      requireConfirmation('update_template_metadata', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, 'template:update', OrgResourceType.KNOWLEDGE, String(args.id))
      const res = await templateService.update({ id: String(args.id), metadata: args.metadata as any, authorId: ctx.userId })
      return { id: res.id, path: `/knowledge/${res.id}`, kind: 'template' }
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
      validateLimits(args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_READ, OrgResourceType.WORKSPACE)
      const rows = await prisma.knowledge.findMany({
        where: { workspaceId: ctx.workspaceId ?? '', isTemplate: false },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(Math.max(Number(args.limit ?? 10), 1), 50),
        select: { id: true, title: true, updatedAt: true, collectionId: true },
      })
      return rows.map((r) => ({ ...r, path: `/knowledge/${r.id}` }))
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
      validateLimits(args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_READ, OrgResourceType.KNOWLEDGE, String(args.id))
      const k = await prisma.knowledge.findUnique({ where: { id: String(args.id) }, select: { id: true, title: true, content: true, collectionId: true, updatedAt: true } })
      if (!k) return null
      return { ...k, path: `/knowledge/${k.id}` }
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
      validateLimits(args)
      requireConfirmation('update_document', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_UPDATE, OrgResourceType.KNOWLEDGE, String(args.id))
      const updated = await prisma.knowledge.update({ where: { id: String(args.id) }, data: { ...(args.title ? { title: String(args.title) } : {}), ...(args.content ? { content: String(args.content) } : {}) }, select: { id: true, title: true } })
      return { ...updated, path: `/knowledge/${updated.id}` }
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
      validateLimits(args)
      requireConfirmation('move_document', args)
      await ensureAccess(ctx.userId, ctx.workspaceId, OrgPermission.DOCUMENT_UPDATE, OrgResourceType.KNOWLEDGE, String(args.id))
      const updated = await prisma.knowledge.update({ where: { id: String(args.id) }, data: { collectionId: String(args.collectionId) }, select: { id: true, title: true, collectionId: true } })
      return { ...updated, path: `/knowledge/${updated.id}` }
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
      validateLimits(args)
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
      validateLimits(args)
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
      validateLimits(args)
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

// Lightweight guardrails on inputs to prevent abuse/overload
function validateLimits(args: any) {
  const MAX_CONTENT = 50_000
  const MAX_TAGS = 20
  if (typeof args?.content === 'string' && args.content.length > MAX_CONTENT) {
    const e: any = new Error('Content too large; please summarize before creating or updating (max 50k characters).')
    e.status = 413
    throw e
  }
  if (Array.isArray(args?.tags) && args.tags.length > MAX_TAGS) {
    const e: any = new Error('Too many tags; please limit to 20.')
    e.status = 400
    throw e
  }
}
