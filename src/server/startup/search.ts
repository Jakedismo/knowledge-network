import { registerIndexHandler } from '@/server/modules/search/emitter'
import { ElasticStubHandler } from '@/server/modules/search/elastic/stub-handler'

let registered = false
export function ensureSearchHandlerRegistered() {
  if (registered) return
  const enableStub = process.env.SEARCH_STUB !== '0'
  if (enableStub) {
    registerIndexHandler(new ElasticStubHandler())
    registered = true
  }
}

// Eager register on import for convenience in API routes
ensureSearchHandlerRegistered()

