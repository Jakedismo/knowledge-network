import { db, type Document, type SyncMetadata } from './db'
import { networkMonitor, waitForOnline } from './network-monitor'
import { actionQueue } from './action-queue'

export interface VectorClock {
  [nodeId: string]: number
}

export interface SyncDelta {
  documentId: string
  operations: Operation[]
  vectorClock: VectorClock
  timestamp: Date
}

export interface Operation {
  type: 'insert' | 'delete' | 'update' | 'format'
  position?: number
  content?: string
  attributes?: Record<string, any>
  timestamp: Date
  userId: string
}

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'three-way-merge' | 'manual'
  resolver?: (local: any, remote: any, base: any) => any
}

export class SyncEngine {
  private syncInProgress = false
  private syncInterval?: NodeJS.Timeout
  private readonly nodeId: string
  private vectorClock: VectorClock = {}
  private conflictResolution: ConflictResolution

  constructor(nodeId?: string, conflictResolution?: ConflictResolution) {
    this.nodeId = nodeId || this.generateNodeId()
    this.conflictResolution = conflictResolution || {
      strategy: 'last-write-wins'
    }

    this.initialize()
  }

  private generateNodeId(): string {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async initialize() {
    // Load vector clock from storage
    await this.loadVectorClock()

    // Setup sync triggers
    this.setupSyncTriggers()

    // Start periodic sync if online
    if (networkMonitor.isOnline()) {
      this.startPeriodicSync()
    }
  }

  private async loadVectorClock() {
    const metadata = await db.syncMetadata.get('main')
    if (metadata?.vectorClock) {
      this.vectorClock = metadata.vectorClock
    }
  }

  private async saveVectorClock() {
    await db.syncMetadata.put({
      id: 'main',
      lastSyncTime: new Date(),
      syncVersion: '1.0.0',
      vectorClock: this.vectorClock,
      conflictResolutionStrategy: this.conflictResolution.strategy
    })
  }

  private setupSyncTriggers() {
    // Sync when coming online
    networkMonitor.on('online', () => {
      this.sync()
      this.startPeriodicSync()
    })

    // Stop sync when going offline
    networkMonitor.on('offline', () => {
      this.stopPeriodicSync()
    })

    // Sync after actions complete
    actionQueue.on('actionSuccess', () => {
      setTimeout(() => this.sync(), 1000)
    })
  }

  private startPeriodicSync(interval = 5 * 60 * 1000) {
    this.stopPeriodicSync()
    this.syncInterval = setInterval(() => {
      if (networkMonitor.isOnline()) {
        this.sync()
      }
    }, interval)
  }

  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
  }

  /**
   * Main sync method
   */
  async sync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress')
      return
    }

    if (!networkMonitor.isOnline()) {
      console.log('Cannot sync: offline')
      return
    }

    this.syncInProgress = true
    console.log('Starting sync...')

    try {
      // Get local changes
      const localChanges = await this.getLocalChanges()

      // Send changes and receive remote changes
      const remoteChanges = await this.exchangeChanges(localChanges)

      // Apply remote changes
      await this.applyRemoteChanges(remoteChanges)

      // Update sync metadata
      await this.updateSyncMetadata()

      console.log('Sync completed successfully')
      this.emit('syncComplete', { success: true })
    } catch (error) {
      console.error('Sync failed:', error)
      this.emit('syncError', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Get local changes since last sync
   */
  private async getLocalChanges(): Promise<SyncDelta[]> {
    const pendingDocs = await db.documents
      .where('syncStatus')
      .equals('pending')
      .toArray()

    const deltas: SyncDelta[] = []

    for (const doc of pendingDocs) {
      const delta: SyncDelta = {
        documentId: doc.id,
        operations: doc.localChanges || [],
        vectorClock: this.incrementClock(),
        timestamp: new Date()
      }
      deltas.push(delta)
    }

    return deltas
  }

  /**
   * Exchange changes with server
   */
  private async exchangeChanges(localChanges: SyncDelta[]): Promise<SyncDelta[]> {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        nodeId: this.nodeId,
        vectorClock: this.vectorClock,
        changes: localChanges
      })
    })

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.changes || []
  }

  /**
   * Apply remote changes to local database
   */
  private async applyRemoteChanges(remoteChanges: SyncDelta[]): Promise<void> {
    for (const delta of remoteChanges) {
      const localDoc = await db.documents.get(delta.documentId)

      if (!localDoc) {
        // New document from server
        await this.createDocumentFromRemote(delta)
      } else {
        // Existing document - check for conflicts
        const hasConflict = await this.detectConflict(localDoc, delta)

        if (hasConflict) {
          await this.resolveConflict(localDoc, delta)
        } else {
          await this.mergeChanges(localDoc, delta)
        }
      }

      // Update vector clock
      this.mergeVectorClock(delta.vectorClock)
    }
  }

  /**
   * Create document from remote delta
   */
  private async createDocumentFromRemote(delta: SyncDelta): Promise<void> {
    // Apply operations to reconstruct document
    let content = ''
    for (const op of delta.operations) {
      if (op.type === 'insert') {
        content += op.content || ''
      }
    }

    await db.documents.add({
      id: delta.documentId,
      workspaceId: 'default', // This should come from delta
      title: 'Synced Document', // This should come from delta
      content,
      version: 1,
      lastModified: delta.timestamp,
      syncStatus: 'synced'
    })
  }

  /**
   * Detect if there's a conflict between local and remote changes
   */
  private async detectConflict(local: Document, remote: SyncDelta): boolean {
    // Check if local has unsaved changes
    if (local.syncStatus === 'pending' && local.localChanges?.length) {
      // Check vector clocks for concurrent edits
      return !this.isClockAhead(remote.vectorClock)
    }
    return false
  }

  /**
   * Resolve conflict between local and remote changes
   */
  private async resolveConflict(local: Document, remote: SyncDelta): Promise<void> {
    console.log(`Resolving conflict for document ${local.id}`)

    switch (this.conflictResolution.strategy) {
      case 'last-write-wins':
        await this.resolveLastWriteWins(local, remote)
        break

      case 'three-way-merge':
        await this.resolveThreeWayMerge(local, remote)
        break

      case 'manual':
        await this.resolveManual(local, remote)
        break
    }
  }

  /**
   * Last-write-wins conflict resolution
   */
  private async resolveLastWriteWins(local: Document, remote: SyncDelta): Promise<void> {
    const localTime = local.lastModified.getTime()
    const remoteTime = remote.timestamp.getTime()

    if (remoteTime > localTime) {
      // Remote wins - apply remote changes
      await this.applyOperations(local, remote.operations)
      await db.documents.update(local.id, {
        syncStatus: 'synced',
        localChanges: []
      })
    } else {
      // Local wins - mark for next sync
      await db.documents.update(local.id, {
        syncStatus: 'pending'
      })
    }
  }

  /**
   * Three-way merge conflict resolution (simplified)
   */
  private async resolveThreeWayMerge(local: Document, remote: SyncDelta): Promise<void> {
    // This is a simplified implementation
    // In production, you'd use a proper CRDT or OT library

    const localOps = local.localChanges || []
    const remoteOps = remote.operations

    // Transform operations
    const transformedOps = this.transformOperations(localOps, remoteOps)

    // Apply transformed operations
    await this.applyOperations(local, transformedOps)

    await db.documents.update(local.id, {
      syncStatus: 'synced',
      localChanges: []
    })
  }

  /**
   * Manual conflict resolution
   */
  private async resolveManual(local: Document, remote: SyncDelta): Promise<void> {
    // Mark document as having conflict
    await db.documents.update(local.id, {
      syncStatus: 'conflict',
      metadata: {
        ...local.metadata,
        conflict: {
          local: local.content,
          remote: this.reconstructContent(remote.operations),
          timestamp: new Date()
        }
      }
    })

    // Emit conflict event for UI to handle
    this.emit('conflict', {
      documentId: local.id,
      local: local.content,
      remote: this.reconstructContent(remote.operations)
    })
  }

  /**
   * Merge changes without conflict
   */
  private async mergeChanges(local: Document, remote: SyncDelta): Promise<void> {
    await this.applyOperations(local, remote.operations)
    await db.documents.update(local.id, {
      syncStatus: 'synced',
      localChanges: []
    })
  }

  /**
   * Apply operations to document
   */
  private async applyOperations(doc: Document, operations: Operation[]): Promise<void> {
    let content = doc.content

    for (const op of operations) {
      switch (op.type) {
        case 'insert':
          if (op.position !== undefined && op.content) {
            content = content.slice(0, op.position) + op.content + content.slice(op.position)
          }
          break

        case 'delete':
          if (op.position !== undefined && op.attributes?.length) {
            content = content.slice(0, op.position) +
                     content.slice(op.position + op.attributes.length)
          }
          break

        case 'update':
          // Replace entire content
          if (op.content) {
            content = op.content
          }
          break
      }
    }

    await db.documents.update(doc.id, {
      content,
      lastModified: new Date(),
      version: doc.version + 1
    })
  }

  /**
   * Transform operations for operational transformation
   */
  private transformOperations(local: Operation[], remote: Operation[]): Operation[] {
    // Simplified OT - in production use a proper OT library
    const transformed: Operation[] = []

    for (const remoteOp of remote) {
      let transformedOp = { ...remoteOp }

      for (const localOp of local) {
        if (localOp.type === 'insert' && remoteOp.type === 'insert') {
          if (localOp.position !== undefined &&
              remoteOp.position !== undefined &&
              localOp.position <= remoteOp.position) {
            transformedOp.position! += (localOp.content?.length || 0)
          }
        }
      }

      transformed.push(transformedOp)
    }

    return transformed
  }

  /**
   * Reconstruct content from operations
   */
  private reconstructContent(operations: Operation[]): string {
    let content = ''
    for (const op of operations) {
      if (op.type === 'insert' && op.content) {
        content += op.content
      }
    }
    return content
  }

  /**
   * Vector clock operations
   */
  private incrementClock(): VectorClock {
    this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] || 0) + 1
    return { ...this.vectorClock }
  }

  private mergeVectorClock(remote: VectorClock): void {
    for (const [nodeId, timestamp] of Object.entries(remote)) {
      this.vectorClock[nodeId] = Math.max(
        this.vectorClock[nodeId] || 0,
        timestamp
      )
    }
  }

  private isClockAhead(remote: VectorClock): boolean {
    for (const [nodeId, timestamp] of Object.entries(remote)) {
      if ((this.vectorClock[nodeId] || 0) < timestamp) {
        return false
      }
    }
    return true
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(): Promise<void> {
    await this.saveVectorClock()

    // Mark all synced documents
    await db.documents
      .where('syncStatus')
      .equals('pending')
      .modify({ syncStatus: 'synced', localChanges: [] })
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    return sessionStorage.getItem('accessToken') ||
           localStorage.getItem('accessToken') ||
           ''
  }

  /**
   * Force sync a specific document
   */
  async syncDocument(documentId: string): Promise<void> {
    await waitForOnline()

    const doc = await db.documents.get(documentId)
    if (!doc) {
      throw new Error('Document not found')
    }

    // Mark as pending to force sync
    await db.documents.update(documentId, { syncStatus: 'pending' })

    // Trigger sync
    await this.sync()
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflictManually(documentId: string, resolution: 'local' | 'remote' | 'merged', mergedContent?: string): Promise<void> {
    const doc = await db.documents.get(documentId)
    if (!doc || doc.syncStatus !== 'conflict') {
      throw new Error('No conflict to resolve')
    }

    let content: string
    const conflict = doc.metadata?.conflict

    switch (resolution) {
      case 'local':
        content = conflict?.local || doc.content
        break
      case 'remote':
        content = conflict?.remote || doc.content
        break
      case 'merged':
        if (!mergedContent) {
          throw new Error('Merged content required')
        }
        content = mergedContent
        break
    }

    await db.documents.update(documentId, {
      content,
      syncStatus: 'pending',
      metadata: {
        ...doc.metadata,
        conflict: undefined
      }
    })

    // Trigger sync
    await this.sync()
  }

  /**
   * Event emitter functionality
   */
  private listeners: Map<string, Set<Function>> = new Map()

  private emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  on(event: string, handler: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    return () => {
      const handlers = this.listeners.get(event)
      if (handlers) {
        handlers.delete(handler)
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPeriodicSync()
    this.listeners.clear()
  }
}

// Create and export singleton
export const syncEngine = new SyncEngine()

// React hook for sync status
export function useSyncStatus() {
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)
  const [conflicts, setConflicts] = React.useState<string[]>([])

  React.useEffect(() => {
    const updateLastSync = async () => {
      const metadata = await db.syncMetadata.get('main')
      if (metadata) {
        setLastSyncTime(metadata.lastSyncTime)
      }
    }

    updateLastSync()

    const unsubComplete = syncEngine.on('syncComplete', () => {
      setIsSyncing(false)
      updateLastSync()
    })

    const unsubError = syncEngine.on('syncError', () => {
      setIsSyncing(false)
    })

    const unsubConflict = syncEngine.on('conflict', (data: any) => {
      setConflicts(prev => [...prev, data.documentId])
    })

    return () => {
      unsubComplete()
      unsubError()
      unsubConflict()
    }
  }, [])

  return {
    isSyncing,
    lastSyncTime,
    conflicts,
    sync: () => {
      setIsSyncing(true)
      return syncEngine.sync()
    },
    resolveConflict: syncEngine.resolveConflictManually.bind(syncEngine)
  }
}

import React from 'react'