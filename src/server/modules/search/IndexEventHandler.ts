import { EventEmitter } from 'events'
import type { IndexEvent, IndexEventHandler as IIndexEventHandler } from './types'
import { projectKnowledgeToIndex } from './projection'

// Minimal, type-safe handler that validates projection and logs.
// The actual indexing is handled by the elastic handler registered via emitter/startup.
export class IndexEventHandler extends EventEmitter implements IIndexEventHandler {
  async handle(event: IndexEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'UPSERT': {
          const id = event.knowledgeId ?? event.entityId
          if (id) await projectKnowledgeToIndex(id)
          break
        }
        case 'DELETE':
        case 'REINDEX_COLLECTION':
        case 'REINDEX_TAG':
        case 'REINDEX_WORKSPACE':
          // No-op here; elastic handler reacts to these in production.
          break
        default:
          // eslint-disable-next-line no-console
          console.warn('Unknown index event type', event)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('IndexEventHandler error', err)
    }
  }
}

// Singleton instance
let handler: IndexEventHandler | null = null;

/**
 * Get or create the index event handler instance
 */
export function getIndexEventHandler(): IndexEventHandler {
  if (!handler) {
    handler = new IndexEventHandler();
  }
  return handler;
}

/**
 * Register the index handler with the system
 */
export function registerIndexHandler(): void {
  // Kept for API compatibility; Elastic or stub handlers register via emitter.
  const _ = getIndexEventHandler()
  // eslint-disable-next-line no-console
  console.log('Index event handler (noop) registered')
}

/**
 * Emit an index event
 */
export function emitIndexEvent(event: IndexEvent): void {
  const eventHandler = getIndexEventHandler()
  void eventHandler.handle(event)
}