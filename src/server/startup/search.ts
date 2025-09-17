import { registerIndexHandler } from '@/server/modules/search/emitter'
import { ElasticStubHandler } from '@/server/modules/search/elastic/stub-handler'
import { registerElasticHandler } from '@/server/modules/search/elastic/handler'

let registered = false
export function ensureSearchHandlerRegistered() {
  if (registered) return
  const useElastic = !!process.env.ELASTICSEARCH_URL && process.env.SEARCH_USE_ELASTIC !== '0'
  if (useElastic) {
    // Prefer full Elastic handler when configured
    registerElasticHandler()
    registered = true
    return
  }
  // Fallback to stub (default)
  if (process.env.SEARCH_STUB !== '0') {
    registerIndexHandler(new ElasticStubHandler())
    registered = true
  }
}

// Eager register on import for convenience in API routes
ensureSearchHandlerRegistered()
