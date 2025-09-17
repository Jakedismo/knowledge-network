import { prisma } from '@/lib/db/prisma'
import type { IndexDocument, IndexDocumentFacet } from './types'

export async function projectKnowledgeToIndex(id: string): Promise<IndexDocument | null> {
  const k = await prisma.knowledge.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      metadata: true,
      workspaceId: true,
      author: { select: { id: true, displayName: true } },
      collection: { select: { id: true, name: true, parentId: true, workspaceId: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  })
  if (!k) return null

  const facets: IndexDocumentFacet[] = []
  const metaRows = await prisma.metadataIndexEntry.findMany({
    where: { knowledgeId: id },
    select: { keyPath: true, valueType: true, stringVal: true, numberVal: true, dateVal: true, boolVal: true },
    orderBy: { keyPath: 'asc' },
  })
  for (const r of metaRows) {
    facets.push({
      keyPath: r.keyPath,
      type: r.valueType as any,
      stringVal: r.stringVal,
      numberVal: r.numberVal,
      dateVal: r.dateVal ? r.dateVal.toISOString() : null,
      boolVal: r.boolVal,
    })
  }

  const collectionPath = await buildCollectionPath(k.collection?.id ?? null)
  const tags = k.tags.map((t: { tag: { id: string; name: string; color: string | null } }) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color }))

  const doc: IndexDocument = {
    id: k.id,
    workspaceId: k.workspaceId,
    title: k.title,
    contentText: k.content, // plain text content; Phase 2A may supply extracted text
    excerpt: k.excerpt ?? null,
    status: k.status as any,
    author: { id: k.author.id, displayName: k.author.displayName },
    collection: k.collection ? { id: k.collection.id, name: k.collection.name } : null,
    collectionPath,
    tags,
    metadata: (k.metadata ?? {}) as Record<string, unknown>,
    facets,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }
  return doc
}

async function buildCollectionPath(id: string | null): Promise<Array<{ id: string; name: string }>> {
  const path: Array<{ id: string; name: string }> = []
  let cur = id
  for (let i = 0; i < 128 && cur; i++) {
    const node = await prisma.collection.findUnique({ where: { id: cur }, select: { id: true, name: true, parentId: true } })
    if (!node) break
    path.unshift({ id: node.id, name: node.name })
    cur = node.parentId
  }
  return path
}
