import type { ActivityEvent, Content } from './types'
import { prisma } from '@/lib/db/prisma'
import { KnowledgeStatus, ActivityAction } from '@prisma/client'

let eventCounter = 0

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
    const statuses = this.includeDrafts ? undefined : [KnowledgeStatus.REVIEW, KnowledgeStatus.PUBLISHED]

    const rows = await prisma.knowledge.findMany({
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
    })

    const knowledgeIds = rows.map((row) => row.id)
    const embeddings = knowledgeIds.length
      ? await prisma.knowledgeEmbedding.findMany({ where: { knowledgeId: { in: knowledgeIds } }, select: { knowledgeId: true, embedding: true } })
      : []
    const embeddingMap = new Map(embeddings.map((e) => [e.knowledgeId, e.embedding]))

    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt ?? undefined,
      status: row.status,
      author: { id: row.author.id, displayName: row.author.displayName },
      collection: row.collection
        ? { id: row.collection.id, name: row.collection.name, path: row.collection.name }
        : undefined,
      collectionPath: row.collection?.name,
      tags: row.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color ?? undefined })),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      viewCount: row.viewCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      searchVector: embeddingMap.get(row.id) ?? undefined,
    }))
  }

  async listEvents(workspaceId: string): Promise<ActivityEvent[]> {
    const logs = await prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: this.maxEvents,
    })

    return logs
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

    const created = await prisma.activityLog.create({
      data: {
        id: event.id,
        action,
        resourceType: event.knowledgeId ? 'KNOWLEDGE' : 'WORKSPACE',
        resourceId: event.knowledgeId ?? null,
        metadata: metadata as any,
        userId: event.userId,
        workspaceId: event.workspaceId,
        createdAt: new Date(event.timestamp ?? Date.now()),
      },
    })

    return {
      id: created.id,
      userId: created.userId ?? event.userId,
      workspaceId: created.workspaceId ?? event.workspaceId,
      type: event.type,
      knowledgeId: event.knowledgeId,
      authorId: event.authorId,
      tagIds: event.tagIds,
      timestamp: created.createdAt.getTime(),
      weight: event.weight,
    }
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

function mapActivityLogToEvent(log: { id: string; action: ActivityAction; resourceId: string | null; metadata: unknown; userId: string | null; workspaceId: string | null; createdAt: Date }): ActivityEvent | null {
  const meta = (log.metadata ?? {}) as Record<string, unknown>
  const eventType = (meta.eventType as ActivityEvent['type']) ?? actionToDefaultEvent(log.action)
  if (!eventType) return null

  const knowledgeId = typeof meta.knowledgeId === 'string' ? meta.knowledgeId : log.resourceId ?? undefined
  const tagIds = Array.isArray(meta.tagIds) ? (meta.tagIds.filter((x): x is string => typeof x === 'string')) : undefined
  const authorId = typeof meta.authorId === 'string' ? meta.authorId : undefined
  const weight = typeof meta.weight === 'number' ? meta.weight : undefined
  const userId = log.userId ?? (meta.userId as string | undefined) ?? 'system'
  const workspaceId = log.workspaceId ?? (meta.workspaceId as string | undefined)
  if (!workspaceId) return null

  return {
    id: log.id,
    userId,
    workspaceId,
    type: eventType,
    knowledgeId,
    authorId,
    tagIds,
    timestamp: log.createdAt.getTime(),
    weight,
  }
}

function mapEventTypeToAction(type: ActivityEvent['type']): ActivityAction {
  switch (type) {
    case 'view':
    case 'click':
      return ActivityAction.VIEW
    case 'like':
    case 'save':
      return ActivityAction.UPDATE
    case 'comment':
      return ActivityAction.COMMENT
    case 'share':
      return ActivityAction.SHARE
    case 'followAuthor':
    case 'followTag':
      return ActivityAction.UPDATE
    case 'search':
      return ActivityAction.CREATE
    default:
      return ActivityAction.UPDATE
  }
}

function actionToDefaultEvent(action: ActivityAction): ActivityEvent['type'] | null {
  switch (action) {
    case ActivityAction.VIEW:
      return 'view'
    case ActivityAction.SHARE:
      return 'share'
    case ActivityAction.COMMENT:
      return 'comment'
    case ActivityAction.CREATE:
      return 'view'
    case ActivityAction.UPDATE:
      return 'view'
    case ActivityAction.DELETE:
      return 'view'
    case ActivityAction.COLLABORATE:
      return 'view'
    default:
      return null
  }
}

function generateEventId(): string {
  eventCounter += 1
  return `evt_${eventCounter.toString(16)}`
}
