import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/lib/offline/db'
import { NetworkMonitor, ConnectionState } from '@/lib/offline/network-monitor'
import { OfflineActionQueue } from '@/lib/offline/action-queue'
import { SyncEngine } from '@/lib/offline/sync-engine'
import { OfflineEditor } from '@/lib/offline/editor-offline'

// Mock fetch
global.fetch = vi.fn()

describe('Offline Database', () => {
  beforeEach(async () => {
    await db.clearAll()
  })

  it('should store and retrieve documents', async () => {
    const document = {
      id: 'test-doc-1',
      workspaceId: 'workspace-1',
      title: 'Test Document',
      content: 'Test content',
      version: 1,
      lastModified: new Date(),
      syncStatus: 'pending' as const
    }

    await db.documents.add(document)
    const retrieved = await db.documents.get('test-doc-1')

    expect(retrieved).toBeDefined()
    expect(retrieved?.title).toBe('Test Document')
    expect(retrieved?.content).toBe('Test content')
  })

  it('should handle media cache', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    const media = {
      id: 'media-1',
      url: 'https://example.com/image.jpg',
      blob,
      mimeType: 'image/jpeg',
      size: 1024,
      cached: new Date()
    }

    await db.media.add(media)
    const retrieved = await db.media.get('media-1')

    expect(retrieved).toBeDefined()
    expect(retrieved?.url).toBe('https://example.com/image.jpg')
    expect(retrieved?.size).toBe(1024)
  })

  it('should get pending actions in priority order', async () => {
    await db.actions.bulkAdd([
      {
        id: '1',
        type: 'update',
        resource: 'document',
        resourceId: 'doc-1',
        payload: {},
        timestamp: new Date(),
        retries: 0,
        status: 'pending',
        priority: 'low'
      },
      {
        id: '2',
        type: 'update',
        resource: 'document',
        resourceId: 'doc-2',
        payload: {},
        timestamp: new Date(),
        retries: 0,
        status: 'pending',
        priority: 'critical'
      },
      {
        id: '3',
        type: 'update',
        resource: 'document',
        resourceId: 'doc-3',
        payload: {},
        timestamp: new Date(),
        retries: 0,
        status: 'pending',
        priority: 'normal'
      }
    ])

    const actions = await db.getPendingActions()

    expect(actions).toHaveLength(3)
    expect(actions[0].priority).toBe('critical')
    expect(actions[1].priority).toBe('normal')
    expect(actions[2].priority).toBe('low')
  })

  it('should cleanup expired media', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.media.bulkAdd([
      {
        id: 'expired',
        url: 'expired.jpg',
        blob: new Blob(),
        mimeType: 'image/jpeg',
        size: 100,
        cached: new Date(),
        expiresAt: past
      },
      {
        id: 'valid',
        url: 'valid.jpg',
        blob: new Blob(),
        mimeType: 'image/jpeg',
        size: 100,
        cached: new Date(),
        expiresAt: future
      }
    ])

    const cleaned = await db.cleanupExpiredMedia()

    expect(cleaned).toBe(1)
    expect(await db.media.get('expired')).toBeUndefined()
    expect(await db.media.get('valid')).toBeDefined()
  })
})

describe('Network Monitor', () => {
  let monitor: NetworkMonitor

  beforeEach(() => {
    monitor = new NetworkMonitor()
  })

  afterEach(() => {
    monitor.destroy()
  })

  it('should detect online state', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })

    expect(monitor.isOnline()).toBe(true)
    expect(monitor.isOffline()).toBe(false)
  })

  it('should detect offline state', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    const newMonitor = new NetworkMonitor()
    expect(newMonitor.isOffline()).toBe(true)
    expect(newMonitor.isOnline()).toBe(false)
    newMonitor.destroy()
  })

  it('should emit status changes', async () => {
    const statusChanges: any[] = []

    monitor.onStatusChange((status) => {
      statusChanges.push(status)
    })

    // Trigger online event
    window.dispatchEvent(new Event('online'))
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger offline event
    window.dispatchEvent(new Event('offline'))
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(statusChanges.length).toBeGreaterThan(0)
  })
})

describe('Offline Action Queue', () => {
  let queue: OfflineActionQueue

  beforeEach(async () => {
    await db.clearAll()
    queue = new OfflineActionQueue()
  })

  it('should enqueue actions', async () => {
    const actionId = await queue.enqueue({
      type: 'create',
      resource: 'document',
      resourceId: 'doc-1',
      payload: { title: 'Test' }
    })

    expect(actionId).toBeDefined()
    const action = await db.actions.get(actionId)
    expect(action).toBeDefined()
    expect(action?.type).toBe('create')
  })

  it('should process queue when online', async () => {
    // Mock successful API call
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    await queue.enqueue({
      type: 'update',
      resource: 'document',
      resourceId: 'doc-1',
      payload: { content: 'Updated' }
    })

    // Mock online state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })

    await queue.process()

    // Check that action was processed and removed
    const remaining = await db.actions.count()
    expect(remaining).toBe(0)
  })

  it('should retry failed actions with backoff', async () => {
    let attempts = 0
    ;(global.fetch as any).mockImplementation(() => {
      attempts++
      if (attempts < 3) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true })
      })
    })

    const actionId = await queue.enqueue({
      type: 'update',
      resource: 'document',
      resourceId: 'doc-1',
      payload: { content: 'Test' }
    })

    // Process multiple times to trigger retries
    await queue.process()
    await new Promise(resolve => setTimeout(resolve, 1100))
    await queue.process()
    await new Promise(resolve => setTimeout(resolve, 2100))
    await queue.process()

    // Check that action eventually succeeded
    const action = await db.actions.get(actionId)
    expect(action).toBeUndefined() // Should be removed after success
  })

  it('should respect priority order', async () => {
    const processedOrder: string[] = []

    ;(global.fetch as any).mockImplementation((url: string, options: any) => {
      const body = JSON.parse(options.body)
      processedOrder.push(body.priority)
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true })
      })
    })

    // Add actions with different priorities
    await queue.enqueue({
      type: 'update',
      resource: 'document',
      resourceId: 'low',
      payload: { priority: 'low' },
      priority: 'low'
    })

    await queue.enqueue({
      type: 'update',
      resource: 'document',
      resourceId: 'critical',
      payload: { priority: 'critical' },
      priority: 'critical'
    })

    await queue.enqueue({
      type: 'update',
      resource: 'document',
      resourceId: 'normal',
      payload: { priority: 'normal' },
      priority: 'normal'
    })

    await queue.process()

    expect(processedOrder).toEqual(['critical', 'normal', 'low'])
  })
})

describe('Sync Engine', () => {
  let syncEngine: SyncEngine

  beforeEach(async () => {
    await db.clearAll()
    syncEngine = new SyncEngine('test-node')
  })

  afterEach(() => {
    syncEngine.destroy()
  })

  it('should detect conflicts', async () => {
    // Add a document with local changes
    await db.documents.add({
      id: 'doc-1',
      workspaceId: 'workspace-1',
      title: 'Test',
      content: 'Local content',
      version: 1,
      lastModified: new Date(),
      syncStatus: 'pending',
      localChanges: [
        {
          type: 'update',
          content: 'Local change',
          timestamp: new Date(),
          userId: 'user-1'
        }
      ]
    })

    // Mock server response with different content
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [
          {
            documentId: 'doc-1',
            operations: [
              {
                type: 'update',
                content: 'Server change',
                timestamp: new Date(),
                userId: 'user-2'
              }
            ],
            vectorClock: { 'server-node': 2 },
            timestamp: new Date()
          }
        ]
      })
    })

    let conflictDetected = false
    syncEngine.on('conflict', () => {
      conflictDetected = true
    })

    await syncEngine.sync()

    expect(conflictDetected).toBe(true)
  })

  it('should resolve conflicts with last-write-wins', async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 1000)

    await db.documents.add({
      id: 'doc-1',
      workspaceId: 'workspace-1',
      title: 'Test',
      content: 'Local content',
      version: 1,
      lastModified: earlier,
      syncStatus: 'pending'
    })

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [
          {
            documentId: 'doc-1',
            operations: [
              {
                type: 'update',
                content: 'Server content (newer)',
                timestamp: now
              }
            ],
            vectorClock: { 'server-node': 1 },
            timestamp: now
          }
        ]
      })
    })

    await syncEngine.sync()

    const doc = await db.documents.get('doc-1')
    expect(doc?.content).toBe('Server content (newer)')
  })
})

describe('Offline Editor', () => {
  let editor: OfflineEditor

  beforeEach(async () => {
    await db.clearAll()
    editor = new OfflineEditor('test-user')
  })

  afterEach(() => {
    editor.destroy()
  })

  it('should initialize with document', async () => {
    await editor.initialize('doc-1')

    const content = editor.getContent()
    expect(content).toBe('') // New document starts empty

    const status = editor.getSaveStatus()
    expect(status.hasUnsavedChanges).toBe(false)
  })

  it('should handle text insertion', async () => {
    await editor.initialize('doc-1')

    await editor.handleInsert(0, 'Hello ')
    await editor.handleInsert(6, 'World')

    expect(editor.getContent()).toBe('Hello World')

    const status = editor.getSaveStatus()
    expect(status.hasUnsavedChanges).toBe(true)
  })

  it('should handle text deletion', async () => {
    await editor.initialize('doc-1')

    await editor.handleChange('Hello World')
    await editor.handleDelete(5, 6)

    expect(editor.getContent()).toBe('Hello')
  })

  it('should auto-save changes', async () => {
    await editor.initialize('doc-1')

    await editor.handleChange('Test content')

    // Wait for debounce + auto-save
    await new Promise(resolve => setTimeout(resolve, 1600))

    const doc = await db.documents.get('doc-1')
    expect(doc?.content).toBe('Test content')
    expect(doc?.syncStatus).toBe('pending')
  })

  it('should export and import documents', async () => {
    await editor.initialize('doc-1')
    await editor.handleChange('Export test content')

    const exported = await editor.exportDocument()
    expect(exported.content).toBe('Export test content')

    // Clear and reimport
    await db.clearAll()

    await editor.importDocument({
      id: 'imported-doc',
      content: 'Imported content',
      metadata: { title: 'Imported' }
    })

    const imported = await db.documents.get('imported-doc')
    expect(imported?.content).toBe('Imported content')
  })
})

describe('Offline/Online Transitions', () => {
  it('should handle offline to online transition', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    const monitor = new NetworkMonitor()
    const queue = new OfflineActionQueue()

    // Add action while offline
    await queue.enqueue({
      type: 'update',
      resource: 'document',
      resourceId: 'doc-1',
      payload: { content: 'Offline change' }
    })

    // Mock successful sync when online
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    // Go online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })

    window.dispatchEvent(new Event('online'))

    // Wait for auto-sync
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Check that queue was processed
    const remaining = await db.actions.count()
    expect(remaining).toBe(0)

    monitor.destroy()
  })

  it('should maintain data consistency during transitions', async () => {
    const editor = new OfflineEditor()
    await editor.initialize('doc-1')

    // Make changes while offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    await editor.handleChange('Offline content')
    await editor.save()

    // Verify saved locally
    const offlineDoc = await db.documents.get('doc-1')
    expect(offlineDoc?.content).toBe('Offline content')
    expect(offlineDoc?.syncStatus).toBe('pending')

    // Go online and sync
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: [] })
    })

    const syncEngine = new SyncEngine()
    await syncEngine.sync()

    // Verify sync status updated
    const syncedDoc = await db.documents.get('doc-1')
    expect(syncedDoc?.syncStatus).toBe('synced')

    editor.destroy()
    syncEngine.destroy()
  })
})

describe('Storage Management', () => {
  it('should enforce storage quotas', async () => {
    // Add many actions to exceed limit
    const actions = Array.from({ length: 15000 }, (_, i) => ({
      id: `action-${i}`,
      type: 'update' as const,
      resource: 'document' as const,
      resourceId: `doc-${i}`,
      payload: {},
      timestamp: new Date(Date.now() - i * 1000),
      retries: 0,
      status: 'failed' as const,
      priority: 'low' as const
    }))

    await db.actions.bulkAdd(actions)

    // Run quota enforcement
    const { StorageManager } = await import('@/lib/offline/db')
    await StorageManager.enforceQuotas()

    // Check that old actions were removed
    const remaining = await db.actions.count()
    expect(remaining).toBeLessThanOrEqual(10000)
  })
})

describe('Conflict Resolution', () => {
  it('should handle three-way merge', async () => {
    const syncEngine = new SyncEngine('test-node', {
      strategy: 'three-way-merge'
    })

    await db.documents.add({
      id: 'doc-1',
      workspaceId: 'workspace-1',
      title: 'Test',
      content: 'Original content',
      version: 1,
      lastModified: new Date(),
      syncStatus: 'pending',
      localChanges: [
        {
          type: 'insert',
          position: 8,
          content: ' local',
          timestamp: new Date(),
          userId: 'user-1'
        }
      ]
    })

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [
          {
            documentId: 'doc-1',
            operations: [
              {
                type: 'insert',
                position: 16,
                content: ' remote',
                timestamp: new Date(),
                userId: 'user-2'
              }
            ],
            vectorClock: { 'server-node': 1 },
            timestamp: new Date()
          }
        ]
      })
    })

    await syncEngine.sync()

    const doc = await db.documents.get('doc-1')
    // Both changes should be applied
    expect(doc?.content).toContain('local')
    expect(doc?.content).toContain('remote')

    syncEngine.destroy()
  })

  it('should handle manual conflict resolution', async () => {
    const syncEngine = new SyncEngine('test-node', {
      strategy: 'manual'
    })

    await db.documents.add({
      id: 'doc-1',
      workspaceId: 'workspace-1',
      title: 'Test',
      content: 'Local version',
      version: 1,
      lastModified: new Date(),
      syncStatus: 'pending',
      localChanges: [
        {
          type: 'update',
          content: 'Local version',
          timestamp: new Date(),
          userId: 'user-1'
        }
      ]
    })

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [
          {
            documentId: 'doc-1',
            operations: [
              {
                type: 'update',
                content: 'Remote version',
                timestamp: new Date(),
                userId: 'user-2'
              }
            ],
            vectorClock: { 'server-node': 2 },
            timestamp: new Date()
          }
        ]
      })
    })

    let conflictData: any = null
    syncEngine.on('conflict', (data) => {
      conflictData = data
    })

    await syncEngine.sync()

    expect(conflictData).toBeDefined()
    expect(conflictData.local).toBe('Local version')
    expect(conflictData.remote).toBe('Remote version')

    // Resolve manually
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: [] })
    })

    await syncEngine.resolveConflictManually('doc-1', 'merged', 'Merged version')

    const doc = await db.documents.get('doc-1')
    expect(doc?.content).toBe('Merged version')

    syncEngine.destroy()
  })
})