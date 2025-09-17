import type { IndexEvent, IndexEventHandler, IndexDocument } from '../types'
import { projectKnowledgeToIndex } from '../projection'
import { getElasticClient, KNOWLEDGE_INDEX_CONFIG, initializeIndex } from './client'
import { Client } from '@elastic/elasticsearch'
// Use loose types to avoid hard deps when not running ES locally
type BulkOperationContainer = any
type BulkResponseItem = any
import { prisma } from '@/lib/prisma'

interface BatchedOperation {
  operation: BulkOperationContainer
  document?: IndexDocument
}

// High-performance ElasticSearch handler with batching and optimization
export class ElasticHandler implements IndexEventHandler {
  private client: Client
  private batchQueue: BatchedOperation[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly batchSize = 100
  private readonly flushInterval = 1000 // ms
  private isProcessing = false
  private initialized = false

  constructor() {
    this.client = getElasticClient()
    this.initialize().catch(console.error)
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return
    await initializeIndex()
    this.initialized = true
  }

  async handle(event: IndexEvent): Promise<void> {
    // Ensure index is initialized
    if (!this.initialized) {
      await this.initialize()
    }

    switch (event.type) {
      case 'UPSERT':
        await this.handleUpsert(event)
        break
      case 'DELETE':
        await this.handleDelete(event)
        break
      case 'REINDEX_COLLECTION':
        await this.handleReindexCollection(event)
        break
      case 'REINDEX_TAG':
        await this.handleReindexTag(event)
        break
    }
  }

  private async handleUpsert(event: IndexEvent): Promise<void> {
    const knowledgeId = event.knowledgeId ?? event.entityId!
    const doc = await projectKnowledgeToIndex(knowledgeId)
    if (!doc) return

    // Add autocomplete suggestions
    const suggest = [
      doc.title,
      ...doc.tags.map(t => t.name),
      doc.collection?.name
    ].filter(Boolean)

    const enrichedDoc = {
      ...doc,
      suggest
    }

    // Add to batch queue for optimal performance
    this.addToBatch({
      operation: {
        index: {
          _index: KNOWLEDGE_INDEX_CONFIG.index,
          _id: doc.id
        }
      },
      document: enrichedDoc
    })
  }

  private async handleDelete(event: IndexEvent): Promise<void> {
    this.addToBatch({
      operation: {
        delete: {
          _index: KNOWLEDGE_INDEX_CONFIG.index,
          _id: (event.knowledgeId ?? event.entityId) as string
        }
      }
    })
  }

  private async handleReindexCollection(event: IndexEvent): Promise<void> {
    // Fetch all knowledge IDs in the collection
    const knowledgeItems = await prisma.knowledge.findMany({
      where: {
        workspaceId: event.workspaceId,
        collectionId: event.collectionId as string
      },
      select: { id: true }
    })

    // Queue reindex for each item
    for (const item of knowledgeItems) {
      await this.handleUpsert({ type: 'UPSERT', workspaceId: event.workspaceId, knowledgeId: item.id, ts: event.ts })
    }
  }

  private async handleReindexTag(event: IndexEvent): Promise<void> {
    // Fetch all knowledge IDs with this tag
    const knowledgeItems = await prisma.knowledgeTag.findMany({
      where: { tagId: event.tagId },
      select: { knowledgeId: true }
    })

    // Queue reindex for each item
    for (const item of knowledgeItems) {
      await this.handleUpsert({ type: 'UPSERT', workspaceId: event.workspaceId, knowledgeId: item.knowledgeId, ts: event.ts })
    }
  }

  private addToBatch(operation: BatchedOperation): void {
    this.batchQueue.push(operation)

    // Flush if batch size reached
    if (this.batchQueue.length >= this.batchSize) {
      this.flush()
      return
    }

    // Set timer for auto-flush
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flush(), this.flushInterval)
    }
  }

  private async flush(): Promise<void> {
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    // Prevent concurrent processing
    if (this.isProcessing || this.batchQueue.length === 0) {
      return
    }

    this.isProcessing = true

    // Extract batch
    const batch = this.batchQueue.splice(0, this.batchSize)

    try {
      // Prepare bulk operations
      const operations: any[] = []
      for (const item of batch) {
        operations.push(item.operation)
        if (item.document) {
          operations.push(item.document)
        }
      }

      // Execute bulk operation
      const response = await this.client.bulk({
        refresh: false, // Don't wait for refresh for better performance
        body: operations
      })

      // Handle errors
      if (response.errors) {
        const errors = response.items.filter((item: any) => {
          const operation = Object.values(item)[0] as BulkResponseItem
          return operation.error
        })
        console.error('Bulk indexing errors:', errors)
      }

      // Log performance metrics
      const took = response.took
      const itemCount = response.items.length
      console.log(`Indexed ${itemCount} documents in ${took}ms (${(took/itemCount).toFixed(2)}ms per doc)`)

    } catch (error) {
      console.error('Bulk indexing failed:', error)
      // Re-queue failed items for retry
      this.batchQueue.unshift(...batch)
    } finally {
      this.isProcessing = false

      // Continue processing if more items in queue
      if (this.batchQueue.length > 0) {
        this.flush()
      }
    }
  }

  // Force flush all pending operations
  async forceFlush(): Promise<void> {
    while (this.batchQueue.length > 0 || this.isProcessing) {
      await this.flush()
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Cleanup on shutdown
  async shutdown(): Promise<void> {
    await this.forceFlush()
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
  }
}

// Singleton instance
let handler: ElasticHandler | null = null

export function getElasticHandler(): ElasticHandler {
  if (!handler) {
    handler = new ElasticHandler()
  }
  return handler
}

// Register handler on startup
export function registerElasticHandler(): void {
  const { registerIndexHandler } = require('../emitter')
  registerIndexHandler(getElasticHandler())
  // eslint-disable-next-line no-console
  console.log('ElasticSearch handler registered')
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (handler) {
    await handler.shutdown()
  }
})

process.on('SIGTERM', async () => {
  if (handler) {
    await handler.shutdown()
  }
})
