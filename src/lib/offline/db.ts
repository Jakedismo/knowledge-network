import Dexie, { type Table } from 'dexie'

// Define types for our database schema
export interface Document {
  id: string
  workspaceId: string
  collectionId?: string
  title: string
  content: string
  version: number
  lastModified: Date
  syncStatus: 'synced' | 'pending' | 'conflict'
  localChanges?: any[]
  metadata?: Record<string, any>
}

export interface MediaCache {
  id: string
  documentId?: string
  url: string
  blob: Blob
  mimeType: string
  size: number
  cached: Date
  expiresAt?: Date
}

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'move' | 'share'
  resource: 'document' | 'collection' | 'workspace' | 'comment'
  resourceId: string
  payload: any
  timestamp: Date
  retries: number
  status: 'pending' | 'processing' | 'failed'
  error?: string
  priority: 'critical' | 'high' | 'normal' | 'low'
}

export interface SyncMetadata {
  id: string
  lastSyncTime: Date
  syncVersion: string
  vectorClock: Record<string, number>
  conflictResolutionStrategy: 'last-write-wins' | 'three-way-merge' | 'manual'
}

export interface UserPreference {
  key: string
  value: any
  syncToServer: boolean
}

// Define our database class
export class OfflineDatabase extends Dexie {
  // Declare tables
  documents!: Table<Document>
  media!: Table<MediaCache>
  actions!: Table<OfflineAction>
  syncMetadata!: Table<SyncMetadata>
  preferences!: Table<UserPreference>

  constructor() {
    super('KnowledgeNetworkOffline')

    // Define database schema
    this.version(1).stores({
      documents: 'id, workspaceId, collectionId, syncStatus, lastModified',
      media: 'id, documentId, url, cached, expiresAt',
      actions: 'id, type, resource, resourceId, status, timestamp, priority',
      syncMetadata: 'id, lastSyncTime',
      preferences: 'key'
    })

    // Add hooks for data validation and transformation
    this.documents.hook('creating', (primKey, obj) => {
      obj.lastModified = new Date()
      obj.syncStatus = obj.syncStatus || 'pending'
      obj.version = obj.version || 1
    })

    this.documents.hook('updating', (modifications, primKey, obj) => {
      modifications.lastModified = new Date()
      if (modifications.content !== undefined && obj.syncStatus === 'synced') {
        modifications.syncStatus = 'pending'
      }
    })

    this.actions.hook('creating', (primKey, obj) => {
      obj.timestamp = new Date()
      obj.retries = 0
      obj.status = 'pending'
      obj.priority = obj.priority || 'normal'
    })
  }

  // Helper method to clear all data
  async clearAll(): Promise<void> {
    await this.transaction('rw', this.documents, this.media, this.actions, this.syncMetadata, this.preferences, async () => {
      await this.documents.clear()
      await this.media.clear()
      await this.actions.clear()
      await this.syncMetadata.clear()
      await this.preferences.clear()
    })
  }

  // Helper method to get storage usage
  async getStorageInfo(): Promise<{
    documentCount: number
    mediaCount: number
    actionCount: number
    estimatedSize: number
  }> {
    const documentCount = await this.documents.count()
    const mediaCount = await this.media.count()
    const actionCount = await this.actions.count()

    let estimatedSize = 0
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      estimatedSize = estimate.usage || 0
    }

    return {
      documentCount,
      mediaCount,
      actionCount,
      estimatedSize
    }
  }

  // Helper method to cleanup expired media
  async cleanupExpiredMedia(): Promise<number> {
    const now = new Date()
    const expiredMedia = await this.media
      .where('expiresAt')
      .below(now)
      .toArray()

    await this.media.bulkDelete(expiredMedia.map(m => m.id))
    return expiredMedia.length
  }

  // Helper method to get pending actions in priority order
  async getPendingActions(): Promise<OfflineAction[]> {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }

    const actions = await this.actions
      .where('status')
      .equals('pending')
      .toArray()

    return actions.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp.getTime() - b.timestamp.getTime()
    })
  }
}

// Create and export the database instance
export const db = new OfflineDatabase()

// Storage management utilities
export class StorageManager {
  private static readonly MAX_DOCUMENT_CACHE = 500 * 1024 * 1024 // 500MB
  private static readonly MAX_MEDIA_CACHE = 1024 * 1024 * 1024 // 1GB
  private static readonly MAX_ACTIONS = 10000

  static async checkQuota(): Promise<{
    available: boolean
    usage: number
    quota: number
    percentUsed: number
  }> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return { available: false, usage: 0, quota: 0, percentUsed: 0 }
    }

    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0

    return {
      available: true,
      usage,
      quota,
      percentUsed
    }
  }

  static async requestPersistence(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false
    }

    const isPersisted = await navigator.storage.persisted()
    if (isPersisted) {
      return true
    }

    return await navigator.storage.persist()
  }

  static async enforceQuotas(): Promise<void> {
    const info = await db.getStorageInfo()

    // Check action queue limit
    if (info.actionCount > this.MAX_ACTIONS) {
      // Remove oldest completed or failed actions
      const toRemove = await db.actions
        .where('status')
        .anyOf('failed')
        .limit(info.actionCount - this.MAX_ACTIONS)
        .toArray()

      await db.actions.bulkDelete(toRemove.map(a => a.id))
    }

    // Check storage quota
    const quota = await this.checkQuota()
    if (quota.percentUsed > 90) {
      // Start aggressive cleanup
      await this.performAggressiveCleanup()
    }
  }

  private static async performAggressiveCleanup(): Promise<void> {
    // Remove expired media
    await db.cleanupExpiredMedia()

    // Remove old synced documents (keep last 100)
    const syncedDocs = await db.documents
      .where('syncStatus')
      .equals('synced')
      .reverse()
      .sortBy('lastModified')

    if (syncedDocs.length > 100) {
      const toRemove = syncedDocs.slice(100)
      await db.documents.bulkDelete(toRemove.map(d => d.id))
    }

    // Clear old failed actions
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    await db.actions
      .where('timestamp')
      .below(oneWeekAgo)
      .and(action => action.status === 'failed')
      .delete()
  }
}

// Export types for use in other modules
export type { Table }
export { Dexie }