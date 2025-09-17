import { prisma } from '@/lib/db/prisma'
import { emitDelete, emitUpsert } from '@/server/modules/search/emitter'
import { templateAnalytics } from './analytics.service'
import { renderTemplate } from './templating'
import type {
  ApplyTemplateInput,
  CommitVersionInput,
  CreateTemplateInput,
  PublishTemplateInput,
  ShareTemplateInput,
  UpdateTemplateInput,
} from './types'

export class TemplateService {
  async create(input: CreateTemplateInput) {
    const created = await prisma.knowledge.create({
      data: {
        workspaceId: input.workspaceId,
        authorId: input.authorId,
        title: input.title,
        content: input.content,
        isTemplate: true,
        ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as any } : {}),
      },
      select: { id: true, workspaceId: true },
    })
    await prisma.knowledgeVersion.create({
      data: {
        knowledgeId: created.id,
        authorId: input.authorId,
        versionNumber: 1,
        content: input.content,
        changeSummary: 'Initial version',
        branchName: 'main',
      },
    })
    await emitUpsert(input.workspaceId, created.id)
    await templateAnalytics.log({ type: 'CREATE', templateId: created.id, workspaceId: input.workspaceId, userId: input.authorId })
    return created
  }

  async update(input: UpdateTemplateInput & { authorId: string }) {
    const k = await prisma.knowledge.findUnique({ where: { id: input.id }, select: { id: true, workspaceId: true, version: true, content: true } })
    if (!k) throw new Error('Template not found')

    const nextVersion = (k.version ?? 1) + 1
    const updated = await prisma.knowledge.update({
      where: { id: input.id },
      data: {
        title: input.title,
        content: input.content,
        ...(input.metadata !== undefined ? { metadata: input.metadata as any } : {}),
        ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
        version: nextVersion,
      },
      select: { id: true, workspaceId: true },
    })
    await prisma.knowledgeVersion.create({
      data: {
        knowledgeId: input.id,
        authorId: input.authorId,
        versionNumber: nextVersion,
        content: input.content ?? k.content,
        changeSummary: input.changeSummary ?? 'Update',
        branchName: input.branchName ?? 'main',
      },
    })
    await emitUpsert(updated.workspaceId, input.id)
    await templateAnalytics.log({ type: 'UPDATE', templateId: input.id, workspaceId: updated.workspaceId, userId: input.authorId, metadata: { versionNumber: nextVersion } })
    return updated
  }

  async list(workspaceId: string, opts?: { includeMarketplace?: boolean }) {
    const templates = await prisma.knowledge.findMany({
      where: { workspaceId, isTemplate: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true, metadata: true },
    })
    let marketplace: Array<{ id: string; title: string; visibility: string }> = []
    if (opts?.includeMarketplace) {
      marketplace = await prisma.templateListing.findMany({ where: { visibility: { in: ['PUBLIC', 'UNLISTED'] as any }, status: 'PUBLISHED' as any }, select: { id: true, title: true, visibility: true } })
    }
    return { templates, marketplace }
  }

  async get(id: string) {
    return prisma.knowledge.findUnique({ where: { id }, include: { versions: { orderBy: { versionNumber: 'desc' } } } })
  }

  async remove(id: string, by: { workspaceId: string; userId?: string | null }) {
    await prisma.$transaction(async (tx) => {
      await tx.knowledgeVersion.deleteMany({ where: { knowledgeId: id } })
      await tx.templateListing.deleteMany({ where: { templateId: id } })
      await tx.knowledge.delete({ where: { id } })
    })
    await emitDelete(by.workspaceId, id)
    await templateAnalytics.log({ type: 'DELETE', templateId: id, workspaceId: by.workspaceId, userId: by.userId ?? null })
  }

  async commitVersion(input: CommitVersionInput) {
    const k = await prisma.knowledge.findUnique({ where: { id: input.templateId }, select: { workspaceId: true, version: true } })
    if (!k) throw new Error('Template not found')
    const nextVersion = (k.version ?? 1) + 1
    await prisma.$transaction(async (tx) => {
      await tx.knowledge.update({ where: { id: input.templateId }, data: { content: input.content, version: nextVersion } })
      await tx.knowledgeVersion.create({
        data: {
          knowledgeId: input.templateId,
          authorId: input.authorId,
          versionNumber: nextVersion,
          content: input.content,
          changeSummary: input.changeSummary ?? 'Commit',
          branchName: input.branchName ?? 'main',
        },
      })
    })
    await emitUpsert(k.workspaceId, input.templateId)
  }

  async listVersions(templateId: string, branchName?: string) {
    return prisma.knowledgeVersion.findMany({
      where: { knowledgeId: templateId, ...(branchName ? { branchName } : {}) },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true, changeSummary: true, createdAt: true, branchName: true },
    })
  }

  async apply(input: ApplyTemplateInput) {
    const tpl = await prisma.knowledge.findUnique({ where: { id: input.templateId }, select: { id: true, content: true, workspaceId: true, title: true } })
    if (!tpl) throw new Error('Template not found')
    const content = renderTemplate(tpl.content, input.values ?? {})
    const title = input.target.title ?? `${tpl.title} — Draft`
    const created = await prisma.knowledge.create({
      data: {
        workspaceId: input.target.workspaceId,
        authorId: input.target.authorId,
        title,
        content,
        isTemplate: false,
        templateId: tpl.id,
        ...(input.target.collectionId !== undefined ? { collectionId: input.target.collectionId } : {}),
      },
      select: { id: true, workspaceId: true },
    })
    await templateAnalytics.log({ type: 'CREATE', templateId: tpl.id, workspaceId: input.target.workspaceId, userId: input.target.authorId, metadata: { usedToCreate: created.id } })
    return created
  }

  async share(input: ShareTemplateInput) {
    // Create ACEs for the template knowledge id
    await prisma.$transaction(async (tx) => {
      for (const g of input.grants) {
        await tx.accessControlEntry.upsert({
          where: {
            workspaceId_resourceType_resourceId_subjectType_subjectId: {
              workspaceId: input.workspaceId,
              resourceType: 'KNOWLEDGE' as any,
              resourceId: input.templateId,
              subjectType: g.kind,
              subjectId: g.subjectId,
            },
          },
          update: { permissions: g.permissions as any },
          create: {
            workspaceId: input.workspaceId,
            resourceType: 'KNOWLEDGE' as any,
            resourceId: input.templateId,
            subjectType: g.kind as any,
            subjectId: g.subjectId,
            permissions: g.permissions as any,
          },
        })
      }
    })
    await templateAnalytics.log({ type: 'SHARE', templateId: input.templateId, workspaceId: input.workspaceId })
  }

  async publish(input: PublishTemplateInput) {
    const existing = await prisma.templateListing.findFirst({ where: { templateId: input.templateId } })
    const listing = existing
      ? await prisma.templateListing.update({
          where: { id: existing.id },
          data: {
            visibility: input.visibility as any,
            status: 'PUBLISHED' as any,
            title: input.title,
            description: input.description ?? null,
            categories: (input.categories ?? []) as any,
            tags: (input.tags ?? []) as any,
          },
        })
      : await prisma.templateListing.create({
          data: {
            templateId: input.templateId,
            workspaceId: input.workspaceId,
            creatorId: input.creatorId,
            visibility: input.visibility as any,
            status: 'PUBLISHED' as any,
            title: input.title,
            description: input.description ?? null,
            categories: (input.categories ?? []) as any,
            tags: (input.tags ?? []) as any,
          },
        })
    await emitUpsert(input.workspaceId, input.templateId)
    await templateAnalytics.log({ type: 'PUBLISH', templateId: input.templateId, workspaceId: input.workspaceId, userId: input.creatorId })
    return listing
  }
}

export const templateService = new TemplateService()
