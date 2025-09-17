import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', async () => {
  const db = {
    userNotification: {
      create: vi.fn(async ({ data }) => ({ id: 'n1', ...data, createdAt: new Date(), isRead: false })),
      findMany: vi.fn(async () => []),
      update: vi.fn(async ({ where, data }) => ({ id: where.id, userId: 'u1', title: 't', message: 'm', type: 'info', actionUrl: null, metadata: {}, createdAt: new Date(), isRead: data.isRead, readAt: data.readAt })),
    },
    user: {
      findUnique: vi.fn(async () => ({ preferences: { notifications: { channels: { web: true } } } })),
      update: vi.fn(async ({ data }) => data),
    },
  }
  return { prisma: db }
})

import { notificationService } from '@/server/modules/notifications/notification.service'

describe('notificationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates notifications and returns row', async () => {
    const row = await notificationService.create({ userId: 'u1', title: 'Hello', message: 'World' })
    expect(row).toHaveProperty('id')
    expect(row.isRead).toBe(false)
  })

  it('lists notifications', async () => {
    const items = await notificationService.list({ userId: 'u1', limit: 10 })
    expect(Array.isArray(items)).toBe(true)
  })

  it('reads and updates preferences', async () => {
    const prefs = await notificationService.preferences('u1')
    expect(prefs).toHaveProperty('notifications')
    const next = await notificationService.updatePreferences('u1', { notifications: { digest: 'daily' } })
    expect(next.notifications.digest).toBe('daily')
  })
})

