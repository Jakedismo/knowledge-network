import type { IndexEvent, IndexEventHandler } from '../types'
import { projectKnowledgeToIndex } from '../projection'

// A minimal in-memory stub. In Phase 2D, replace with a real Elastic handler.
export class ElasticStubHandler implements IndexEventHandler {
  private store = new Map<string, any>()

  async handle(event: IndexEvent): Promise<void> {
    switch (event.type) {
      case 'UPSERT': {
        const doc = await projectKnowledgeToIndex(event.knowledgeId)
        if (doc) this.store.set(doc.id, doc)
        break
      }
      case 'DELETE':
        this.store.delete(event.knowledgeId)
        break
      case 'REINDEX_COLLECTION':
      case 'REINDEX_TAG':
        // Phase 2D will expand this to fetch affected knowledge IDs and upsert
        break
      default:
        break
    }
  }

  get(id: string) {
    return this.store.get(id)
  }
}

