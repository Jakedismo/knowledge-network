import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', async () => {
  const db = {
    activityLog: {
      create: vi.fn(async ({ data }) => ({ id: 'a1', ...data, createdAt: new Date() })),
      findMany: vi.fn(async () => []),
    },
    user: {
      findUnique: vi.fn(async () => ({ preferences: { follows: { authors: ['u2'] } } })),
    },
  }
  return { prisma: db }
})

import { activityService } from '@/server/modules/activity/activity.service'

describe('activityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs activity events', async () => {
    const row = await activityService.log({
      action: 'CREATE',
      resourceType: 'KNOWLEDGE',
      resourceId: 'k1',
      userId: 'u1',
      workspaceId: 'w1',
      metadata: { title: 'Doc' },
    })
    expect(row).toHaveProperty('id')
    expect(row).toHaveProperty('resourceId', 'k1')
  })

  it('returns personalized feed with score', async () => {
    const now = new Date()
    const items = [
      { id: 'a', action: 'CREATE', resourceType: 'KNOWLEDGE', resourceId: 'k1', userId: 'u2', workspaceId: 'w', metadata: {}, createdAt: now },
      { id: 'b', action: 'UPDATE', resourceType: 'KNOWLEDGE', resourceId: 'k2', userId: 'u3', workspaceId: 'w', metadata: {}, createdAt: now },
    ] as any
    const { prisma } = await import('@/lib/db/prisma') as any
    prisma.activityLog.findMany.mockResolvedValue(items)
    const feed = await activityService.feed({ userId: 'u1', workspaceId: 'w', limit: 10 })
    expect(feed).toHaveLength(2)
    // u2 is followed, should rank higher
    expect(feed[0].userId).toBe('u2')
    expect(feed[0]).toHaveProperty('score')
  })
})

