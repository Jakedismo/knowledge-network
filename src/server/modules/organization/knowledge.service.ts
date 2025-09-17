import { prisma } from '@/lib/db/prisma'
import { metadataService } from './metadata.service'
import { emitUpsert } from '@/server/modules/search/emitter'
import { activityService } from '@/server/modules/activity/activity.service'

export interface CreateKnowledgeInput {
  workspaceId: string
  authorId: string
  title: string
  content: string
  metadata?: Record<string, any>
  collectionId?: string | null
}

export interface UpdateKnowledgeInput {
  id: string
  title?: string
  content?: string
  metadata?: Record<string, any>
  collectionId?: string | null
  status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'
}

export class KnowledgeService {
  async create(input: CreateKnowledgeInput) {
    const created = await prisma.knowledge.create({
      data: {
        workspaceId: input.workspaceId,
        authorId: input.authorId,
        title: input.title,
        content: input.content,
        ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as any } : {}),
      },
      select: { id: true, metadata: true },
    })
    await metadataService.reindexKnowledge(created.id, (created.metadata ?? {}) as Record<string, any>)
    await emitUpsert(input.workspaceId, created.id)
    // Fire-and-forget activity log
    await activityService.log({
      action: 'CREATE',
      resourceType: 'KNOWLEDGE',
      resourceId: created.id,
      userId: input.authorId,
      workspaceId: input.workspaceId,
      metadata: { title: input.title, collectionId: input.collectionId ?? null },
    })
    return created
  }

  async update(input: UpdateKnowledgeInput) {
    const updated = await prisma.knowledge.update({
      where: { id: input.id },
      data: {
        title: input.title,
        content: input.content,
        ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as any } : {}),
      },
      select: { id: true, metadata: true },
    })
    await metadataService.reindexKnowledge(updated.id, (updated.metadata ?? {}) as Record<string, any>)
    const ws = await prisma.knowledge.findUnique({ where: { id: updated.id }, select: { workspaceId: true } })
    if (ws) await emitUpsert(ws.workspaceId, updated.id)
    // Activity log for update
    await activityService.log({
      action: 'UPDATE',
      resourceType: 'KNOWLEDGE',
      resourceId: updated.id,
      workspaceId: ws?.workspaceId ?? null,
      metadata: { fields: Object.keys({
        ...(input.title !== undefined ? { title: true } : {}),
        ...(input.content !== undefined ? { content: true } : {}),
        ...(input.collectionId !== undefined ? { collectionId: true } : {}),
        ...(input.status !== undefined ? { status: true } : {}),
        ...(input.metadata !== undefined ? { metadata: true } : {}),
      }) },
    })
    return updated
  }
}

export const knowledgeService = new KnowledgeService()
