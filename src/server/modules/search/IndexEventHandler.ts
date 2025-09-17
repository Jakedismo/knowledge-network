import { EventEmitter } from 'events';
import { SearchService } from './SearchService';
import { IndexEvent, IndexEventHandler as IIndexEventHandler, BulkIndexOperation } from './types';
import { ProjectionService } from './ProjectionService';

/**
 * Handles real-time index updates based on domain events
 */
export class IndexEventHandler extends EventEmitter implements IIndexEventHandler {
  private searchService: SearchService;
  private projectionService: ProjectionService;
  private queue: Map<string, IndexEvent> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchDelay = 100; // Process batch after 100ms
  private readonly maxBatchSize = 100;

  constructor() {
    super();
    this.searchService = new SearchService();
    this.projectionService = new ProjectionService();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up listeners for domain events
   */
  private setupEventListeners(): void {
    // Knowledge events
    this.on('knowledge:created', this.handleKnowledgeCreated.bind(this));
    this.on('knowledge:updated', this.handleKnowledgeUpdated.bind(this));
    this.on('knowledge:deleted', this.handleKnowledgeDeleted.bind(this));
    this.on('knowledge:statusChanged', this.handleKnowledgeStatusChanged.bind(this));

    // Collection events
    this.on('collection:updated', this.handleCollectionUpdated.bind(this));
    this.on('collection:deleted', this.handleCollectionDeleted.bind(this));

    // Tag events
    this.on('tag:updated', this.handleTagUpdated.bind(this));
    this.on('tag:deleted', this.handleTagDeleted.bind(this));

    // Workspace events
    this.on('workspace:reindex', this.handleWorkspaceReindex.bind(this));
  }

  /**
   * Main event handler
   */
  async handle(event: IndexEvent): Promise<void> {
    console.log(`Processing index event: ${event.type} for ${event.entityId}`);

    try {
      switch (event.type) {
        case 'UPSERT':
          await this.queueIndexOperation(event.entityId, event.workspaceId, 'index');
          break;

        case 'DELETE':
          await this.searchService.delete(event.entityId, event.workspaceId);
          break;

        case 'REINDEX_COLLECTION':
          await this.reindexCollection(event.entityId, event.workspaceId);
          break;

        case 'REINDEX_TAG':
          await this.reindexTag(event.entityId, event.workspaceId);
          break;

        case 'REINDEX_WORKSPACE':
          await this.searchService.reindexWorkspace(event.workspaceId);
          break;

        default:
          console.warn(`Unknown index event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Failed to handle index event ${event.type}:`, error);
      // Emit error event for monitoring
      this.emit('index:error', {
        event,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle knowledge created event
   */
  private async handleKnowledgeCreated(event: {
    knowledgeId: string;
    workspaceId: string;
    userId: string;
  }): Promise<void> {
    await this.handle({
      type: 'UPSERT',
      entityId: event.knowledgeId,
      workspaceId: event.workspaceId,
      timestamp: new Date(),
      metadata: { userId: event.userId }
    });
  }

  /**
   * Handle knowledge updated event
   */
  private async handleKnowledgeUpdated(event: {
    knowledgeId: string;
    workspaceId: string;
    userId: string;
    changes: any;
  }): Promise<void> {
    // For partial updates, we could optimize by only updating changed fields
    // For now, we'll reindex the entire document
    await this.handle({
      type: 'UPSERT',
      entityId: event.knowledgeId,
      workspaceId: event.workspaceId,
      timestamp: new Date(),
      metadata: { userId: event.userId, changes: event.changes }
    });
  }

  /**
   * Handle knowledge deleted event
   */
  private async handleKnowledgeDeleted(event: {
    knowledgeId: string;
    workspaceId: string;
    userId: string;
  }): Promise<void> {
    await this.handle({
      type: 'DELETE',
      entityId: event.knowledgeId,
      workspaceId: event.workspaceId,
      timestamp: new Date(),
      metadata: { userId: event.userId }
    });
  }

  /**
   * Handle knowledge status changed event
   */
  private async handleKnowledgeStatusChanged(event: {
    knowledgeId: string;
    workspaceId: string;
    oldStatus: string;
    newStatus: string;
    userId: string;
  }): Promise<void> {
    // Status changes are important for permission filtering
    // Reindex immediately
    await this.searchService.index(event.knowledgeId);

    // Emit metric for status change
    this.emit('metrics:statusChange', {
      from: event.oldStatus,
      to: event.newStatus,
      workspaceId: event.workspaceId
    });
  }

  /**
   * Handle collection updated event
   */
  private async handleCollectionUpdated(event: {
    collectionId: string;
    workspaceId: string;
    changes: any;
  }): Promise<void> {
    // When a collection is updated, we need to reindex all documents in that collection
    await this.handle({
      type: 'REINDEX_COLLECTION',
      entityId: event.collectionId,
      workspaceId: event.workspaceId,
      timestamp: new Date(),
      metadata: { changes: event.changes }
    });
  }

  /**
   * Handle collection deleted event
   */
  private async handleCollectionDeleted(event: {
    collectionId: string;
    workspaceId: string;
  }): Promise<void> {
    // When a collection is deleted, documents may need to be updated
    // to remove the collection reference
    await this.reindexCollection(event.collectionId, event.workspaceId);
  }

  /**
   * Handle tag updated event
   */
  private async handleTagUpdated(event: {
    tagId: string;
    workspaceId: string;
    changes: any;
  }): Promise<void> {
    await this.handle({
      type: 'REINDEX_TAG',
      entityId: event.tagId,
      workspaceId: event.workspaceId,
      timestamp: new Date(),
      metadata: { changes: event.changes }
    });
  }

  /**
   * Handle tag deleted event
   */
  private async handleTagDeleted(event: {
    tagId: string;
    workspaceId: string;
  }): Promise<void> {
    await this.reindexTag(event.tagId, event.workspaceId);
  }

  /**
   * Handle workspace reindex event
   */
  private async handleWorkspaceReindex(event: {
    workspaceId: string;
    reason: string;
  }): Promise<void> {
    console.log(`Reindexing workspace ${event.workspaceId}: ${event.reason}`);
    await this.handle({
      type: 'REINDEX_WORKSPACE',
      entityId: event.workspaceId,
      workspaceId: event.workspaceId,
      timestamp: new Date(),
      metadata: { reason: event.reason }
    });
  }

  /**
   * Queue an index operation for batch processing
   */
  private async queueIndexOperation(
    knowledgeId: string,
    workspaceId: string,
    operation: 'index' | 'update'
  ): Promise<void> {
    const key = `${workspaceId}:${knowledgeId}`;

    this.queue.set(key, {
      type: 'UPSERT',
      entityId: knowledgeId,
      workspaceId,
      timestamp: new Date()
    });

    // If queue is full, process immediately
    if (this.queue.size >= this.maxBatchSize) {
      await this.processBatch();
    } else if (!this.batchTimer) {
      // Otherwise, set a timer to process the batch
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
    }
  }

  /**
   * Process queued index operations in batch
   */
  private async processBatch(): Promise<void> {
    if (this.queue.size === 0) return;

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get all queued operations
    const operations = Array.from(this.queue.values());
    this.queue.clear();

    console.log(`Processing batch of ${operations.length} index operations`);

    // Group by workspace for efficiency
    const byWorkspace = new Map<string, string[]>();
    for (const op of operations) {
      const ids = byWorkspace.get(op.workspaceId) || [];
      ids.push(op.entityId);
      byWorkspace.set(op.workspaceId, ids);
    }

    // Process each workspace's documents
    for (const [workspaceId, knowledgeIds] of byWorkspace) {
      try {
        const bulkOps: BulkIndexOperation[] = await Promise.all(
          knowledgeIds.map(async (id) => {
            const document = await this.projectionService.projectToIndex(id);
            return {
              operation: 'index' as const,
              document: document || undefined,
              documentId: id,
              workspaceId
            };
          })
        );

        // Filter out null documents
        const validOps = bulkOps.filter(op => op.document);

        if (validOps.length > 0) {
          await this.searchService.bulkIndex(validOps);
          console.log(`Indexed ${validOps.length} documents for workspace ${workspaceId}`);
        }
      } catch (error) {
        console.error(`Batch indexing failed for workspace ${workspaceId}:`, error);
        // Emit error for monitoring
        this.emit('index:batchError', {
          workspaceId,
          documentCount: knowledgeIds.length,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Reindex all documents in a collection
   */
  private async reindexCollection(collectionId: string, workspaceId: string): Promise<void> {
    console.log(`Reindexing collection ${collectionId} in workspace ${workspaceId}`);

    // This would query the database for all documents in the collection
    // and reindex them. Implementation depends on your data access layer.
    // For now, we'll emit an event that can be handled by the application layer

    this.emit('reindex:collection', {
      collectionId,
      workspaceId,
      timestamp: new Date()
    });
  }

  /**
   * Reindex all documents with a specific tag
   */
  private async reindexTag(tagId: string, workspaceId: string): Promise<void> {
    console.log(`Reindexing documents with tag ${tagId} in workspace ${workspaceId}`);

    // This would query the database for all documents with this tag
    // and reindex them

    this.emit('reindex:tag', {
      tagId,
      workspaceId,
      timestamp: new Date()
    });
  }

  /**
   * Get handler statistics
   */
  getStats(): {
    queueSize: number;
    batchPending: boolean;
    eventsProcessed: number;
  } {
    return {
      queueSize: this.queue.size,
      batchPending: this.batchTimer !== null,
      eventsProcessed: this.listenerCount('knowledge:created') // Example metric
    };
  }

  /**
   * Flush any pending operations
   */
  async flush(): Promise<void> {
    if (this.queue.size > 0) {
      await this.processBatch();
    }
  }

  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    // Process any remaining queued operations
    await this.flush();

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Remove all listeners
    this.removeAllListeners();

    console.log('IndexEventHandler shutdown complete');
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
  const eventHandler = getIndexEventHandler();

  // This would typically be called during application startup
  console.log('Index event handler registered');
}

/**
 * Emit an index event
 */
export function emitIndexEvent(event: IndexEvent): void {
  const eventHandler = getIndexEventHandler();
  eventHandler.handle(event);
}