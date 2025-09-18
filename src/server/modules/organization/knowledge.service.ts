import { prisma } from '@/lib/db/prisma'
import { metadataService } from './metadata.service'
import { emitUpsert } from '@/server/modules/search/emitter'
import { activityService } from '@/server/modules/activity/activity.service'
import { contentIntelligenceService } from '@/server/modules/content-intel/analyze.service'

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
    // Content intelligence enrichment (env-gated)
    if (process.env.CONTENT_INTEL_ENRICH !== '0') {
      try {
        const analysis = await contentIntelligenceService.analyze({ content: input.content, title: input.title, maxTags: 10, maxSummarySentences: 3 })
        const aiMeta = {
          ai: {
            summary: analysis.summary,
            keywords: analysis.keywords.slice(0, 10),
            tags: analysis.tags.slice(0, 10),
            entities: analysis.entities.slice(0, 20),
            readability: analysis.readability,
            quality: analysis.quality,
            sentiment: { score: analysis.sentiment.score, comparative: analysis.sentiment.comparative },
            language: analysis.language,
            concepts: analysis.concepts.slice(0, 10),
          },
        }
        const merged = { ...(created.metadata ?? {}), ...aiMeta }
        await prisma.knowledge.update({ where: { id: created.id }, data: { excerpt: analysis.summary.slice(0, 500), metadata: merged as any } })
        await metadataService.reindexKnowledge(created.id, merged as Record<string, any>)
      } catch (e) {
        // Enrichment is best-effort; log via activity but do not fail creation
        await activityService.log({ action: 'UPDATE', resourceType: 'KNOWLEDGE', resourceId: created.id, metadata: { enrichmentError: (e as Error).message } })
        await metadataService.reindexKnowledge(created.id, (created.metadata ?? {}) as Record<string, any>)
      }
    } else {
      await metadataService.reindexKnowledge(created.id, (created.metadata ?? {}) as Record<string, any>)
    }
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
    // If content or title changed, refresh enrichment
    if (process.env.CONTENT_INTEL_ENRICH !== '0' && (input.content !== undefined || input.title !== undefined)) {
      try {
        const doc = await prisma.knowledge.findUnique({ where: { id: updated.id }, select: { title: true, content: true } })
        const analysis = await contentIntelligenceService.analyze({ content: doc?.content ?? '', title: doc?.title ?? '', maxTags: 10, maxSummarySentences: 3 })
        const aiMeta = {
          ai: {
            summary: analysis.summary,
            keywords: analysis.keywords.slice(0, 10),
            tags: analysis.tags.slice(0, 10),
            entities: analysis.entities.slice(0, 20),
            readability: analysis.readability,
            quality: analysis.quality,
            sentiment: { score: analysis.sentiment.score, comparative: analysis.sentiment.comparative },
            language: analysis.language,
            concepts: analysis.concepts.slice(0, 10),
          },
        }
        const merged = { ...(updated.metadata ?? {}), ...aiMeta }
        await prisma.knowledge.update({ where: { id: updated.id }, data: { excerpt: analysis.summary.slice(0, 500), metadata: merged as any } })
        await metadataService.reindexKnowledge(updated.id, merged as Record<string, any>)
      } catch (e) {
        await activityService.log({ action: 'UPDATE', resourceType: 'KNOWLEDGE', resourceId: updated.id, metadata: { enrichmentError: (e as Error).message } })
        await metadataService.reindexKnowledge(updated.id, (updated.metadata ?? {}) as Record<string, any>)
      }
    } else {
      await metadataService.reindexKnowledge(updated.id, (updated.metadata ?? {}) as Record<string, any>)
    }
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
