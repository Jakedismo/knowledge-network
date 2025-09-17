import { prisma } from '@/lib/db/prisma'
import { metadataService } from './metadata.service'
import { emitUpsert } from '@/server/modules/search/emitter'

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
    return updated
  }
}

export const knowledgeService = new KnowledgeService()
