import type { IndexEvent, IndexEventHandler } from './types'

const handlers = new Set<IndexEventHandler>()

export function registerIndexHandler(h: IndexEventHandler) {
  handlers.add(h)
  return () => handlers.delete(h)
}

async function broadcast(event: IndexEvent) {
  await Promise.allSettled(Array.from(handlers).map((h) => h.handle(event)))
  if (handlers.size === 0) {
    // Fallback: log for observability in dev
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[index-event]', event)
    }
  }
}

export async function emitUpsert(workspaceId: string, knowledgeId: string) {
  await broadcast({ type: 'UPSERT', workspaceId, knowledgeId, ts: new Date().toISOString() })
}

export async function emitDelete(workspaceId: string, knowledgeId: string) {
  await broadcast({ type: 'DELETE', workspaceId, knowledgeId, ts: new Date().toISOString() })
}

export async function emitReindexForCollection(workspaceId: string, collectionId: string) {
  await broadcast({ type: 'REINDEX_COLLECTION', workspaceId, collectionId, ts: new Date().toISOString() })
}

export async function emitReindexForTag(workspaceId: string, tagId: string) {
  await broadcast({ type: 'REINDEX_TAG', workspaceId, tagId, ts: new Date().toISOString() })
}

