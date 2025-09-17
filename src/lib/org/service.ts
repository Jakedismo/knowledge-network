import { z } from 'zod'
import { ACL, CollectionNode, CollectionsTree, KnowledgeMetadataSchema, Tag, Workspace } from './types'

// Deterministic ID helper (non-random path for tests; falls back to nanoid)
function newId(prefix: string): string {
  const t = Date.now().toString(36)
  return `${prefix}_${t}_${Math.random().toString(36).slice(2, 8)}`
}

export interface OrgService {
  listWorkspaces(userId: string): Promise<Workspace[]>
  createWorkspace(userId: string, name: string, description?: string): Promise<Workspace>

  getCollectionsTree(workspaceId: string, userId: string): Promise<CollectionsTree>
  createCollection(input: {
    workspaceId: string
    userId: string
    name: string
    parentId?: string | null
    description?: string
  }): Promise<CollectionNode>
  moveCollection(input: { workspaceId: string; userId: string; id: string; newParentId: string | null }): Promise<void>
  reorderCollection(input: { workspaceId: string; userId: string; id: string; newSortOrder: number }): Promise<void>

  suggestTags(workspaceId: string, userId: string, q: string): Promise<Tag[]>
  upsertTag(input: { workspaceId: string; userId: string; name: string; color?: string }): Promise<Tag>

  listMetadataSchemas(workspaceId: string, userId: string): Promise<KnowledgeMetadataSchema[]>
  registerMetadataSchema(input: {
    workspaceId: string
    userId: string
    knowledgeType: string
    version: string
    title: string
    description?: string
    zodJson: Record<string, unknown>
  }): Promise<KnowledgeMetadataSchema>
}

type InMemory = {
  workspaces: Map<string, Workspace>
  userWorkspaces: Map<string, Set<string>> // userId -> workspaceId set
  collections: Map<string, CollectionNode[]> // workspaceId -> roots
  tags: Map<string, Map<string, Tag>> // workspaceId -> name -> Tag
  schemas: Map<string, Map<string, KnowledgeMetadataSchema[]>> // workspaceId -> knowledgeType -> versions
}

const mem: InMemory = {
  workspaces: new Map(),
  userWorkspaces: new Map(),
  collections: new Map(),
  tags: new Map(),
  schemas: new Map(),
}

function now(): Date {
  return new Date()
}

function findNodeAndChain(tree: CollectionNode[], id: string, chain: ACL[] = []): { node: CollectionNode | null; chain: ACL[] } {
  for (const n of tree) {
    const nextChain = n.metadata?.acl ? [...chain, n.metadata.acl] : chain
    if (n.id === id) return { node: n, chain: nextChain }
    const res = findNodeAndChain(n.children, id, nextChain)
    if (res.node) return res
  }
  return { node: null, chain }
}

export const orgService: OrgService = {
  async listWorkspaces(userId) {
    const wsIds = Array.from(mem.userWorkspaces.get(userId) ?? [])
    return wsIds.map((id) => mem.workspaces.get(id)!).filter(Boolean)
  },

  async createWorkspace(userId, name, description) {
    const w: Workspace = {
      id: newId('ws'),
      name,
      description,
      isActive: true,
      settings: {},
      createdAt: now(),
      updatedAt: now(),
    }
    mem.workspaces.set(w.id, w)
    if (!mem.userWorkspaces.has(userId)) mem.userWorkspaces.set(userId, new Set())
    mem.userWorkspaces.get(userId)!.add(w.id)
    mem.collections.set(w.id, [])
    mem.tags.set(w.id, new Map())
    mem.schemas.set(w.id, new Map())
    return w
  },

  async getCollectionsTree(workspaceId) {
    return mem.collections.get(workspaceId) ?? []
  },

  async createCollection({ workspaceId, name, parentId, description }) {
    const node: CollectionNode = {
      id: newId('col'),
      name,
      description,
      color: undefined,
      icon: undefined,
      sortOrder: 0,
      workspaceId,
      parentId: parentId ?? null,
      metadata: {},
      children: [],
      createdAt: now(),
      updatedAt: now(),
    }
    const roots = mem.collections.get(workspaceId) ?? []
    if (!parentId) {
      roots.push(node)
    } else {
      const { node: parent } = findNodeAndChain(roots, parentId)
      if (!parent) throw new Error('Parent not found')
      parent.children.push(node)
    }
    mem.collections.set(workspaceId, roots)
    return node
  },

  async moveCollection({ workspaceId, id, newParentId }) {
    const roots = mem.collections.get(workspaceId) ?? []
    let found: CollectionNode | null = null

    function detach(list: CollectionNode[], target: string): CollectionNode | null {
      for (let i = 0; i < list.length; i++) {
        const n = list[i]
        if (n.id === target) {
          list.splice(i, 1)
          return n
        }
        const r = detach(n.children, target)
        if (r) return r
      }
      return null
    }

    found = detach(roots, id)
    if (!found) throw new Error('Collection not found')
    found.updatedAt = now()
    found.parentId = newParentId

    if (!newParentId) {
      roots.push(found)
    } else {
      const { node: parent } = findNodeAndChain(roots, newParentId)
      if (!parent) throw new Error('New parent not found')
      parent.children.push(found)
    }
    mem.collections.set(workspaceId, roots)
  },

  async reorderCollection({ workspaceId, id, newSortOrder }) {
    const roots = mem.collections.get(workspaceId) ?? []
    const search = findNodeAndChain(roots, id)
    const node = search.node
    if (!node) throw new Error('Collection not found')
    node.sortOrder = newSortOrder
    node.updatedAt = now()
  },

  async suggestTags(workspaceId, _userId, q) {
    const byName = mem.tags.get(workspaceId) ?? new Map<string, Tag>()
    const all = Array.from(byName.values())
    const lc = q.toLowerCase()
    return all
      .filter((t) => t.name.toLowerCase().includes(lc))
      .sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name))
      .slice(0, 10)
  },

  async upsertTag({ workspaceId, name, color }) {
    let byName = mem.tags.get(workspaceId)
    if (!byName) {
      byName = new Map()
      mem.tags.set(workspaceId, byName)
    }
    const existing = byName.get(name)
    if (existing) {
      existing.color = color ?? existing.color
      existing.usageCount = existing.usageCount + 1
      return existing
    }
    const t: Tag = {
      id: newId('tag'),
      name,
      color,
      usageCount: 1,
      workspaceId,
      createdAt: now(),
    }
    byName.set(name, t)
    return t
  },

  async listMetadataSchemas(workspaceId) {
    const byType = mem.schemas.get(workspaceId) ?? new Map<string, KnowledgeMetadataSchema[]>()
    return Array.from(byType.values()).flat()
  },

  async registerMetadataSchema({ workspaceId, knowledgeType, version, title, description, zodJson }) {
    let byType = mem.schemas.get(workspaceId)
    if (!byType) {
      byType = new Map()
      mem.schemas.set(workspaceId, byType)
    }
    const versions = byType.get(knowledgeType) ?? []
    const schema: KnowledgeMetadataSchema = {
      id: newId('mds'),
      workspaceId,
      knowledgeType,
      version,
      title,
      description,
      zodJson,
      createdAt: now(),
      updatedAt: now(),
    }
    versions.push(schema)
    byType.set(knowledgeType, versions)
    return schema
  },
}
