// Prisma adapter (interface only, no direct @prisma/client import to avoid type resolution issues)
import type { OrgService } from './service'
import type { CollectionNode, KnowledgeMetadataSchema, Tag, Workspace } from './types'

type Dateish = Date | string

// Minimal Prisma-like types to avoid importing '@prisma/client'
interface PrismaLike {
  workspace: {
    findMany(args: any): Promise<any[]>
    create(args: any): Promise<any>
  }
  collection: {
    findMany(args: any): Promise<any[]>
    create(args: any): Promise<any>
    update(args: any): Promise<any>
  }
  tag: {
    findMany(args: any): Promise<any[]>
    upsert(args: any): Promise<any>
  }
}

function mapWorkspace(r: any): Workspace {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    isActive: r.isActive ?? true,
    settings: r.settings ?? {},
    createdAt: new Date(r.createdAt as Dateish),
    updatedAt: new Date(r.updatedAt as Dateish),
  }
}

function toTree(rows: any[]): CollectionNode[] {
  const byId = new Map<string, CollectionNode>()
  const roots: CollectionNode[] = []
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      color: r.color ?? undefined,
      icon: r.icon ?? undefined,
      sortOrder: r.sortOrder ?? 0,
      workspaceId: r.workspaceId,
      parentId: r.parentId ?? null,
      metadata: r.metadata ?? {},
      createdAt: new Date(r.createdAt as Dateish),
      updatedAt: new Date(r.updatedAt as Dateish),
      children: [],
    })
  }
  for (const n of byId.values()) {
    if (!n.parentId) roots.push(n)
    else byId.get(n.parentId)?.children.push(n)
  }
  // stable order
  const order = (list: CollectionNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    list.forEach((c) => order(c.children))
  }
  order(roots)
  return roots
}

function mapTag(r: any): Tag {
  return {
    id: r.id,
    name: r.name,
    color: r.color ?? undefined,
    usageCount: r.usageCount ?? 0,
    workspaceId: r.workspaceId,
    createdAt: new Date(r.createdAt as Dateish),
  }
}

export function createPrismaOrgService(prisma: PrismaLike): OrgService {
  return {
    async listWorkspaces(userId) {
      // NOTE: requires a join on UserWorkspaceRole; for now return all active
      const rows = await prisma.workspace.findMany({ where: { isActive: true } })
      return rows.map(mapWorkspace)
    },
    async createWorkspace(userId, name, description) {
      const row = await prisma.workspace.create({ data: { name, description, isActive: true, settings: {} } })
      return mapWorkspace(row)
    },
    async getCollectionsTree(workspaceId) {
      const rows = await prisma.collection.findMany({ where: { workspaceId } })
      return toTree(rows)
    },
    async createCollection({ workspaceId, name, parentId, description }) {
      const row = await prisma.collection.create({
        data: {
          name,
          description,
          color: null,
          icon: null,
          sortOrder: 0,
          workspaceId,
          parentId: parentId ?? null,
          metadata: {},
        },
      })
      return toTree([row])[0]
    },
    async moveCollection({ workspaceId, id, newParentId }) {
      await prisma.collection.update({ where: { id }, data: { parentId: newParentId } })
    },
    async reorderCollection({ workspaceId, id, newSortOrder }) {
      await prisma.collection.update({ where: { id }, data: { sortOrder: newSortOrder } })
    },
    async suggestTags(workspaceId, _userId, q) {
      const rows = await prisma.tag.findMany({ where: { workspaceId, name: { contains: q, mode: 'insensitive' } }, take: 10 })
      return rows.map(mapTag)
    },
    async upsertTag({ workspaceId, name, color }) {
      const row = await prisma.tag.upsert({
        where: { name_workspaceId: { name, workspaceId } },
        update: { color: color ?? undefined, usageCount: { increment: 1 } },
        create: { name, color: color ?? null, usageCount: 1, workspaceId },
      })
      return mapTag(row)
    },
    async listMetadataSchemas(workspaceId) {
      // Placeholder: in DB-backed version, read from a dedicated table
      return [] as KnowledgeMetadataSchema[]
    },
    async registerMetadataSchema(input) {
      // Placeholder: to be persisted in future migration
      return {
        id: `mds_${Date.now().toString(36)}`,
        workspaceId: input.workspaceId,
        knowledgeType: input.knowledgeType,
        version: input.version,
        title: input.title,
        description: input.description,
        zodJson: input.zodJson,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
  }
}

