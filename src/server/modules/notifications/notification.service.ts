import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { pushBroker } from './push'

export const NotificationTypeSchema = z.enum(['info', 'warning', 'success', 'error'])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export interface CreateNotificationInput {
  userId: string
  title: string
  message: string
  type?: NotificationType
  actionUrl?: string | null
  metadata?: Record<string, unknown>
}

export interface ListNotificationsOptions {
  userId: string
  unreadOnly?: boolean
  limit?: number
  before?: Date
}

export class NotificationService {
  async create(input: CreateNotificationInput) {
    const row = await prisma.userNotification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? 'info',
        actionUrl: input.actionUrl ?? null,
        metadata: (input.metadata ?? {}) as any,
      },
    })
    // Fire-and-forget push to brokers for real-time delivery
    pushBroker.publish(input.userId, { kind: 'notification', data: row })
    return row
  }

  async list(opts: ListNotificationsOptions) {
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100)
    return prisma.userNotification.findMany({
      where: {
        userId: opts.userId,
        ...(opts.unreadOnly ? { isRead: false } : {}),
        ...(opts.before ? { createdAt: { lt: opts.before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async markRead(userId: string, id: string, isRead = true) {
    const row = await prisma.userNotification.update({
      where: { id },
      data: { isRead, readAt: isRead ? new Date() : null },
    })
    pushBroker.publish(userId, { kind: 'notification:update', data: row })
    return row
  }

  async preferences(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } })
    const defaults = {
      notifications: {
        channels: { web: true, email: false, push: false },
        categories: { system: true, mentions: true, review: true },
        quietHours: null as null | { start: string; end: string },
        digest: 'none' as 'none' | 'daily' | 'weekly',
      },
    }
    return { ...defaults, ...(user?.preferences ?? {}) }
  }

  async updatePreferences(userId: string, patch: Record<string, unknown>) {
    // Shallow merge at top-level; clients should send { notifications: {...} }
    const current = await this.preferences(userId)
    const next = { ...current, ...patch }
    await prisma.user.update({ where: { id: userId }, data: { preferences: next as any } })
    return next
  }
}

export const notificationService = new NotificationService()

