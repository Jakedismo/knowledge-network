import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

export const ActivityActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'VIEW',
  'SHARE',
  'COMMENT',
  'COLLABORATE',
])

export type ActivityAction = z.infer<typeof ActivityActionSchema>

export type ResourceType = 'WORKSPACE' | 'COLLECTION' | 'KNOWLEDGE'

export interface LogEventInput {
  action: ActivityAction
  resourceType: ResourceType
  resourceId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  userId?: string | null
  workspaceId?: string | null
}

export interface FeedFilters {
  actions?: ActivityAction[]
  resourceTypes?: ResourceType[]
  resourceIds?: string[]
  authoredBy?: string[] // userIds
}

export interface FeedOptions {
  userId?: string
  workspaceId?: string
  limit?: number
  cursor?: string | null // createdAt cursor (ISO) or id
  filters?: FeedFilters
}

export interface SummaryOptions {
  workspaceId?: string
  userId?: string
  period?: 'hourly' | 'daily' | 'weekly'
  since?: Date
  until?: Date
}

function makeWhere(opts: FeedOptions) {
  const where: any = {}
  if (opts.workspaceId) where.workspaceId = opts.workspaceId
  if (opts.filters?.actions?.length) where.action = { in: opts.filters.actions }
  if (opts.filters?.resourceTypes?.length) where.resourceType = { in: opts.filters.resourceTypes }
  if (opts.filters?.resourceIds?.length) where.resourceId = { in: opts.filters.resourceIds }
  if (opts.filters?.authoredBy?.length) where.userId = { in: opts.filters.authoredBy }
  return where
}

export class ActivityService {
  async log(input: LogEventInput) {
    return prisma.activityLog.create({
      data: {
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: (input.metadata ?? {}) as any,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        userId: input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    })
  }

  async feed(opts: FeedOptions) {
    const where = makeWhere(opts)
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100)

    // Basic personalization: if user has follows in preferences, boost those entries via score
    // We still return raw rows plus a computed score for clients.
    const rows = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    let preferences: any = null
    if (opts.userId) {
      const user = await prisma.user.findUnique({ where: { id: opts.userId }, select: { preferences: true } })
      preferences = user?.preferences ?? null
    }

    const follows = {
      collections: (preferences?.follows?.collections as string[] | undefined) ?? [],
      tags: (preferences?.follows?.tags as string[] | undefined) ?? [],
      authors: (preferences?.follows?.authors as string[] | undefined) ?? [],
    }

    const withScore = rows.map((r) => {
      let score = 1
      if (r.resourceType === 'COLLECTION' && r.resourceId && follows.collections.includes(r.resourceId)) score += 3
      if ((r.metadata as any)?.tagIds && Array.isArray((r.metadata as any).tagIds)) {
        const hit = ((r.metadata as any).tagIds as string[]).some((t) => follows.tags.includes(t))
        if (hit) score += 2
      }
      if (r.userId && follows.authors.includes(r.userId)) score += 2
      // Recent boost within 24h
      const age = Date.now() - new Date(r.createdAt).getTime()
      if (age < 24 * 3600 * 1000) score += 1
      return { ...r, score }
    })

    // Sort by score then createdAt desc to provide personalization
    withScore.sort((a, b) => (b.score - a.score) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    return withScore
  }

  async summarize(opts: SummaryOptions) {
    // Simple aggregation by action per day/week/hour in the range
    const until = opts.until ?? new Date()
    const since = opts.since ?? new Date(until.getTime() - 7 * 24 * 3600 * 1000)
    const where: any = {
      createdAt: { gte: since, lte: until },
    }
    if (opts.workspaceId) where.workspaceId = opts.workspaceId
    if (opts.userId) where.userId = opts.userId

    const data = await prisma.activityLog.findMany({ where, orderBy: { createdAt: 'asc' } })

    const bucket = (d: Date) => {
      const x = new Date(d)
      if (opts.period === 'hourly') x.setMinutes(0, 0, 0)
      else if (opts.period === 'weekly') {
        const day = x.getDay() // 0..6
        const diff = (day + 6) % 7 // start week on Monday
        x.setDate(x.getDate() - diff)
        x.setHours(0, 0, 0, 0)
      } else {
        x.setHours(0, 0, 0, 0)
      }
      return x.toISOString()
    }

    const summary: Record<string, Record<ActivityAction, number>> = {}
    for (const r of data) {
      const k = bucket(new Date(r.createdAt))
      if (!summary[k]) summary[k] = { CREATE: 0, UPDATE: 0, DELETE: 0, VIEW: 0, SHARE: 0, COMMENT: 0, COLLABORATE: 0 }
      summary[k][r.action as ActivityAction]++
    }

    return Object.entries(summary)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, counts]) => ({ period, counts }))
  }
}

export const activityService = new ActivityService()

