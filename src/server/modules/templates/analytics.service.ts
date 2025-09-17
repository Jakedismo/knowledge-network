import { prisma } from '@/lib/db/prisma'

export type TemplateEventType = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SHARE' | 'PUBLISH'

export class TemplateAnalyticsService {
  async log(event: {
    type: TemplateEventType
    templateId: string
    workspaceId?: string | null
    userId?: string | null
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await prisma.activityLog.create({
      data: {
        action: event.type as any,
        resourceType: 'KNOWLEDGE' as any,
        resourceId: event.templateId,
        workspaceId: event.workspaceId ?? null,
        userId: event.userId ?? null,
        metadata: { category: 'template', ...(event.metadata ?? {}) } as any,
      },
    })
  }

  async summarize(templateId: string) {
    const [views, uses, publishes] = await Promise.all([
      prisma.activityLog.count({ where: { resourceId: templateId, action: 'VIEW' as any } }),
      prisma.activityLog.count({ where: { resourceId: templateId, action: 'CREATE' as any } }),
      prisma.activityLog.count({ where: { resourceId: templateId, action: 'PUBLISH' as any } }),
    ])
    return { views, uses, publishes }
  }
}

export const templateAnalytics = new TemplateAnalyticsService()

