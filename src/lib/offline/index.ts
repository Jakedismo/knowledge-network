// Main offline module exports
export * from './db'
export * from './network-monitor'
export * from './action-queue'
export * from './sync-engine'
export * from './editor-offline'

import { db, StorageManager } from './db'
import { networkMonitor } from './network-monitor'
import { actionQueue } from './action-queue'
import { syncEngine } from './sync-engine'
import { Workbox } from 'workbox-window'

export class OfflineManager {
  private static instance: OfflineManager
  private workbox?: Workbox
  private initialized = false

  private constructor() {}

  public static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager()
    }
    return OfflineManager.instance
  }

  /**
   * Initialize offline support
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    console.log('Initializing offline support...')

    try {
      // Request persistent storage
      const persistent = await StorageManager.requestPersistence()
      console.log(`Persistent storage: ${persistent ? 'granted' : 'denied'}`)

      // Check storage quota
      const quota = await StorageManager.checkQuota()
      console.log(`Storage: ${quota.percentUsed.toFixed(2)}% used (${quota.usage}/${quota.quota})`)

      // Initialize service worker
      await this.initServiceWorker()

      // Setup periodic cleanup
      this.setupPeriodicCleanup()

      // Setup sync triggers
      this.setupSyncTriggers()

      this.initialized = true
      console.log('Offline support initialized successfully')
    } catch (error) {
      console.error('Failed to initialize offline support:', error)
      throw error
    }
  }

  /**
   * Initialize service worker
   */
  private async initServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported')
      return
    }

    if (!window.isSecureContext) {
      console.warn('Service Workers require secure context (HTTPS)')
      return
    }

    try {
      // Use Workbox for service worker management
      this.workbox = new Workbox('/sw.js')

      // Add event listeners
      this.workbox.addEventListener('waiting', this.onServiceWorkerWaiting)
      this.workbox.addEventListener('controlling', this.onServiceWorkerControlling)
      this.workbox.addEventListener('activated', this.onServiceWorkerActivated)

      // Register service worker
      const registration = await this.workbox.register()
      console.log('Service Worker registered:', registration)

      // Check for updates every hour
      setInterval(() => {
        this.workbox?.update()
      }, 60 * 60 * 1000)
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  /**
   * Handle service worker waiting
   */
  private onServiceWorkerWaiting = () => {
    console.log('New service worker available')

    // Show update prompt to user
    if (confirm('A new version is available. Update now?')) {
      this.workbox?.messageSkipWaiting()
      this.workbox?.addEventListener('controlling', () => {
        window.location.reload()
      })
    }
  }

  /**
   * Handle service worker controlling
   */
  private onServiceWorkerControlling = () => {
    console.log('Service worker is controlling the page')
  }

  /**
   * Handle service worker activated
   */
  private onServiceWorkerActivated = (event: any) => {
    console.log('Service worker activated:', event)
  }

  /**
   * Setup periodic cleanup
   */
  private setupPeriodicCleanup(): void {
    // Run cleanup every hour
    setInterval(async () => {
      try {
        // Cleanup expired media
        const cleaned = await db.cleanupExpiredMedia()
        if (cleaned > 0) {
          console.log(`Cleaned ${cleaned} expired media items`)
        }

        // Enforce storage quotas
        await StorageManager.enforceQuotas()
      } catch (error) {
        console.error('Periodic cleanup failed:', error)
      }
    }, 60 * 60 * 1000)
  }

  /**
   * Setup sync triggers
   */
  private setupSyncTriggers(): void {
    // Sync on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && networkMonitor.isOnline()) {
        syncEngine.sync()
      }
    })

    // Sync before unload
    window.addEventListener('beforeunload', (e) => {
      // Try to save any pending changes
      const pendingActions = actionQueue.getStats()
      if (pendingActions) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    })
  }

  /**
   * Check if app can work offline
   */
  canWorkOffline(): boolean {
    return this.initialized && 'serviceWorker' in navigator
  }

  /**
   * Get offline status
   */
  async getStatus(): Promise<{
    initialized: boolean
    canWorkOffline: boolean
    networkState: string
    storage: any
    syncStatus: any
    queueStatus: any
  }> {
    const storage = await StorageManager.checkQuota()
    const queueStats = await actionQueue.getStats()

    return {
      initialized: this.initialized,
      canWorkOffline: this.canWorkOffline(),
      networkState: networkMonitor.getState(),
      storage,
      syncStatus: {
        lastSync: (await db.syncMetadata.get('main'))?.lastSyncTime || null
      },
      queueStatus: queueStats
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    if (confirm('This will delete all offline data. Continue?')) {
      await db.clearAll()
      await caches.delete('static-v1')
      await caches.delete('dynamic-v1')
      await caches.delete('documents-v1')
      await caches.delete('media-v1')
      console.log('Offline data cleared')
    }
  }

  /**
   * Export offline data for backup
   */
  async exportData(): Promise<Blob> {
    const documents = await db.documents.toArray()
    const actions = await db.actions.toArray()
    const preferences = await db.preferences.toArray()
    const syncMetadata = await db.syncMetadata.toArray()

    const data = {
      exportedAt: new Date(),
      version: '1.0.0',
      documents,
      actions,
      preferences,
      syncMetadata
    }

    return new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })
  }

  /**
   * Import offline data from backup
   */
  async importData(file: File): Promise<void> {
    const text = await file.text()
    const data = JSON.parse(text)

    if (data.version !== '1.0.0') {
      throw new Error('Incompatible backup version')
    }

    // Clear existing data
    await db.clearAll()

    // Import data
    if (data.documents) {
      await db.documents.bulkAdd(data.documents)
    }
    if (data.actions) {
      await db.actions.bulkAdd(data.actions)
    }
    if (data.preferences) {
      await db.preferences.bulkAdd(data.preferences)
    }
    if (data.syncMetadata) {
      await db.syncMetadata.bulkAdd(data.syncMetadata)
    }

    console.log('Data imported successfully')
  }

  /**
   * Update service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (this.workbox) {
      await this.workbox.update()
    }
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance()

// React hook for offline status
export function useOfflineStatus() {
  const [status, setStatus] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const updateStatus = async () => {
      try {
        const offlineStatus = await offlineManager.getStatus()
        setStatus(offlineStatus)
      } catch (error) {
        console.error('Failed to get offline status:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial status
    updateStatus()

    // Update periodically
    const interval = setInterval(updateStatus, 10000)

    // Listen for network changes
    const unsubscribe = networkMonitor.onStatusChange(() => {
      updateStatus()
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  return {
    status,
    loading,
    clearData: offlineManager.clearOfflineData.bind(offlineManager),
    exportData: offlineManager.exportData.bind(offlineManager),
    importData: offlineManager.importData.bind(offlineManager),
    update: offlineManager.updateServiceWorker.bind(offlineManager)
  }
}

// Initialize on import if in browser
if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      offlineManager.initialize().catch(console.error)
    })
  } else {
    offlineManager.initialize().catch(console.error)
  }
}

import React from 'react'