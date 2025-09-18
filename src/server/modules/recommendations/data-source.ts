import type { ActivityEvent, Content } from './types'
import { KnowledgeStatus as SearchKnowledgeStatus } from '@/server/modules/search/types'

type PrismaActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'SHARE' | 'COMMENT' | 'COLLABORATE'

let eventCounter = 0
let prismaClient: any | null = null

function getPrisma(): any {
  if (!prismaClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
    prismaClient = require('@/lib/db/prisma').prisma
  }
  return prismaClient
}

export interface RecommendationDataSource {
  listContent(workspaceId: string): Promise<Content[]>
  listEvents(workspaceId: string): Promise<ActivityEvent[]>
  appendEvent(event: Omit<ActivityEvent, 'id'> & { id?: string }): Promise<ActivityEvent>
}

export interface PrismaRecommendationDataSourceOptions {
  maxDocuments?: number
  maxEvents?: number
  includeDrafts?: boolean
}

export class PrismaRecommendationDataSource implements RecommendationDataSource {
  private readonly maxDocuments: number
  private readonly maxEvents: number
  private readonly includeDrafts: boolean

  constructor(options: PrismaRecommendationDataSourceOptions = {}) {
    this.maxDocuments = options.maxDocuments ?? Number(process.env.RECOMMENDATIONS_MAX_DOCUMENTS ?? 500)
    this.maxEvents = options.maxEvents ?? Number(process.env.RECOMMENDATIONS_MAX_EVENTS ?? 5000)
    this.includeDrafts = options.includeDrafts ?? process.env.RECOMMENDATIONS_INCLUDE_DRAFTS === 'true'
  }

  async listContent(workspaceId: string): Promise<Content[]> {
    const statuses = this.includeDrafts ? undefined : ['REVIEW', 'PUBLISHED']

    const db = getPrisma()
    const rows = (await db.knowledge.findMany({
      where: {
        workspaceId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: this.maxDocuments,
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        status: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
        workspaceId: true,
        author: { select: { id: true, displayName: true } },
        collection: { select: { id: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    })) as KnowledgeRow[]

    const knowledgeIds = rows.map((row) => row.id)
    const embeddings = knowledgeIds.length
      ? ((await db.knowledgeEmbedding.findMany({ where: { knowledgeId: { in: knowledgeIds } }, select: { knowledgeId: true, embedding: true } })) as KnowledgeEmbeddingRow[])
      : []
    const embeddingMap = new Map(embeddings.map((e) => [e.knowledgeId, e.embedding]))

    return rows.map((row) => {
      const tags = row.tags.map((t) => {
        const tag = { id: t.tag.id, name: t.tag.name } as { id: string; name: string; color?: string }
        if (t.tag.color) tag.color = t.tag.color
        return tag
      })

      const doc: Content = {
        id: row.id,
        workspaceId: row.workspaceId,
        title: row.title,
        content: row.content,
        status: row.status as unknown as SearchKnowledgeStatus,
        author: { id: row.author.id, displayName: row.author.displayName },
        tags,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        viewCount: row.viewCount,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }

      if (row.excerpt) doc.excerpt = row.excerpt
      if (row.collection) {
        doc.collection = { id: row.collection.id, name: row.collection.name, path: row.collection.name }
        doc.collectionPath = row.collection.name
      }
      const vector = embeddingMap.get(row.id)
      if (vector) doc.searchVector = vector
      return doc
    })
  }

  async listEvents(workspaceId: string): Promise<ActivityEvent[]> {
    const db = getPrisma()
    const rows = (await db.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: this.maxEvents,
    })) as ActivityLogRow[]

    return rows
      .map((log) => mapActivityLogToEvent(log))
      .filter((event): event is ActivityEvent => !!event)
  }

  async appendEvent(event: Omit<ActivityEvent, 'id'> & { id?: string }): Promise<ActivityEvent> {
    const action = mapEventTypeToAction(event.type)
    const metadata = {
      eventType: event.type,
      tagIds: event.tagIds,
      authorId: event.authorId,
      weight: event.weight,
    }

    const db = getPrisma()
    const created = await db.activityLog.create({
      data: {
        ...(event.id ? { id: event.id } : {}),
        action,
        resourceType: event.knowledgeId ? 'KNOWLEDGE' : 'WORKSPACE',
        resourceId: event.knowledgeId ?? null,
        metadata: metadata as any,
        userId: event.userId,
        workspaceId: event.workspaceId,
        createdAt: new Date(event.timestamp ?? Date.now()),
      },
    })

    const result: ActivityEvent = {
      id: created.id,
      userId: created.userId ?? event.userId,
      workspaceId: created.workspaceId ?? event.workspaceId,
      type: event.type,
      timestamp: created.createdAt.getTime(),
    }
    if (event.knowledgeId) result.knowledgeId = event.knowledgeId
    if (event.authorId) result.authorId = event.authorId
    if (event.tagIds && event.tagIds.length > 0) result.tagIds = event.tagIds
    if (typeof event.weight === 'number') result.weight = event.weight
    return result
  }
}

export class InMemoryRecommendationDataSource implements RecommendationDataSource {
  private contentByWorkspace = new Map<string, Map<string, Content>>()
  private eventsByWorkspace = new Map<string, ActivityEvent[]>()

  async listContent(workspaceId: string): Promise<Content[]> {
    return [...(this.contentByWorkspace.get(workspaceId)?.values() ?? [])]
  }

  async listEvents(workspaceId: string): Promise<ActivityEvent[]> {
    return [...(this.eventsByWorkspace.get(workspaceId) ?? [])].sort((a, b) => b.timestamp - a.timestamp)
  }

  async appendEvent(event: Omit<ActivityEvent, 'id'> & { id?: string }): Promise<ActivityEvent> {
    const persisted: ActivityEvent = { ...event, id: event.id ?? generateEventId() }
    const list = this.eventsByWorkspace.get(persisted.workspaceId) ?? []
    list.push(persisted)
    this.eventsByWorkspace.set(persisted.workspaceId, list)
    return persisted
  }

  async upsertContent(workspaceId: string, doc: Content): Promise<void> {
    const map = this.contentByWorkspace.get(workspaceId) ?? new Map<string, Content>()
    map.set(doc.id, doc)
    this.contentByWorkspace.set(workspaceId, map)
  }
}

interface KnowledgeRow {
  id: string
  title: string
  content: string
  excerpt: string | null
  status: string
  viewCount: number
  createdAt: Date
  updatedAt: Date
  metadata: unknown
  workspaceId: string
  author: { id: string; displayName: string }
  collection: { id: string; name: string } | null
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>
}

interface KnowledgeEmbeddingRow {
  knowledgeId: string
  embedding: number[]
}

interface ActivityLogRow {
  id: string
  action: PrismaActivityAction
  resourceId: string | null
  metadata: unknown
  userId: string | null
  workspaceId: string | null
  createdAt: Date
}

function mapActivityLogToEvent(log: ActivityLogRow): ActivityEvent | null {
  const meta = (log.metadata ?? {}) as Record<string, unknown>
  const eventType = (meta.eventType as ActivityEvent['type']) ?? actionToDefaultEvent(log.action)
  if (!eventType) return null

  const userId = log.userId ?? (typeof meta.userId === 'string' ? (meta.userId as string) : 'system')
  const workspaceId = log.workspaceId ?? (typeof meta.workspaceId === 'string' ? (meta.workspaceId as string) : undefined)
  if (!workspaceId) return null

  const event: ActivityEvent = {
    id: log.id,
    userId,
    workspaceId,
    type: eventType,
    timestamp: log.createdAt.getTime(),
  }

  const knowledgeId = typeof meta.knowledgeId === 'string' ? meta.knowledgeId : log.resourceId ?? undefined
  if (knowledgeId) event.knowledgeId = knowledgeId
  const tagIds = Array.isArray(meta.tagIds) ? (meta.tagIds.filter((x): x is string => typeof x === 'string')) : undefined
  if (tagIds && tagIds.length > 0) event.tagIds = tagIds
  const authorId = typeof meta.authorId === 'string' ? meta.authorId : undefined
  if (authorId) event.authorId = authorId
  const weight = typeof meta.weight === 'number' ? meta.weight : undefined
  if (typeof weight === 'number' && !Number.isNaN(weight)) event.weight = weight

  return event
}

function mapEventTypeToAction(type: ActivityEvent['type']): PrismaActivityAction {
  switch (type) {
    case 'view':
    case 'click':
      return 'VIEW'
    case 'like':
    case 'save':
      return 'UPDATE'
    case 'comment':
      return 'COMMENT'
    case 'share':
      return 'SHARE'
    case 'followAuthor':
    case 'followTag':
      return 'UPDATE'
    case 'search':
      return 'CREATE'
    default:
      return 'UPDATE'
  }
}

function actionToDefaultEvent(action: PrismaActivityAction): ActivityEvent['type'] | null {
  switch (action) {
    case 'VIEW':
      return 'view'
    case 'SHARE':
      return 'share'
    case 'COMMENT':
      return 'comment'
    case 'CREATE':
      return 'view'
    case 'UPDATE':
      return 'view'
    case 'DELETE':
      return 'view'
    case 'COLLABORATE':
      return 'view'
    default:
      return null
  }
}

function generateEventId(): string {
  eventCounter += 1
  return `evt_${eventCounter.toString(16)}`
}
