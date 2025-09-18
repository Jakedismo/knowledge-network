import { db, type OfflineAction } from './db'
import { networkMonitor } from './network-monitor'
import { v4 as uuidv4 } from 'uuid'

export interface Action {
  type: OfflineAction['type']
  resource: OfflineAction['resource']
  resourceId: string
  payload: any
  priority?: OfflineAction['priority']
}

export interface RetryPolicy {
  maxRetries: number
  backoffMultiplier: number
  initialDelay: number
  maxDelay: number
}

export class OfflineActionQueue {
  private processing = false
  private processPromise: Promise<void> | null = null
  private readonly retryPolicy: RetryPolicy

  constructor(retryPolicy?: Partial<RetryPolicy>) {
    this.retryPolicy = {
      maxRetries: 5,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 60000,
      ...retryPolicy
    }

    // Start processing when coming online
    networkMonitor.on('online', () => {
      this.process()
    })

    // Process queue on initialization if online
    if (networkMonitor.isOnline()) {
      setTimeout(() => this.process(), 1000)
    }
  }

  /**
   * Enqueue an action to be processed
   */
  async enqueue(action: Action): Promise<string> {
    const id = uuidv4()
    const offlineAction: OfflineAction = {
      id,
      ...action,
      timestamp: new Date(),
      retries: 0,
      status: 'pending',
      priority: action.priority || 'normal'
    }

    await db.actions.add(offlineAction)

    // Try to process immediately if online
    if (networkMonitor.isOnline()) {
      this.process()
    }

    return id
  }

  /**
   * Process all pending actions
   */
  async process(): Promise<void> {
    // Prevent concurrent processing
    if (this.processing) {
      return this.processPromise || Promise.resolve()
    }

    this.processing = true
    this.processPromise = this._process()

    try {
      await this.processPromise
    } finally {
      this.processing = false
      this.processPromise = null
    }
  }

  /**
   * Internal processing logic
   */
  private async _process(): Promise<void> {
    if (!networkMonitor.isOnline()) {
      console.log('Offline: skipping action queue processing')
      return
    }

    const actions = await db.getPendingActions()
    console.log(`Processing ${actions.length} pending actions`)

    for (const action of actions) {
      try {
        await this.executeAction(action)
      } catch (error) {
        console.error(`Failed to execute action ${action.id}:`, error)
        await this.handleActionError(action, error)
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    // Update status to processing
    await db.actions.update(action.id, { status: 'processing' })

    try {
      // Perform the actual API call based on action type
      const result = await this.performApiCall(action)

      // Success: remove from queue
      await db.actions.delete(action.id)

      // Emit success event
      this.emit('actionSuccess', { action, result })
    } catch (error) {
      throw error
    }
  }

  /**
   * Perform the actual API call
   */
  private async performApiCall(action: OfflineAction): Promise<any> {
    const endpoint = this.getEndpoint(action)
    const method = this.getMethod(action)

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers from session storage
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: method !== 'DELETE' ? JSON.stringify(action.payload) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Get API endpoint for action
   */
  private getEndpoint(action: OfflineAction): string {
    const baseUrl = '/api'

    switch (action.resource) {
      case 'document':
        return action.type === 'create'
          ? `${baseUrl}/documents`
          : `${baseUrl}/documents/${action.resourceId}`

      case 'collection':
        return action.type === 'create'
          ? `${baseUrl}/org/collections`
          : `${baseUrl}/org/collections/${action.resourceId}`

      case 'workspace':
        return action.type === 'create'
          ? `${baseUrl}/org/workspaces`
          : `${baseUrl}/org/workspaces/${action.resourceId}`

      case 'comment':
        return action.type === 'create'
          ? `${baseUrl}/comments`
          : `${baseUrl}/comments/${action.resourceId}`

      default:
        throw new Error(`Unknown resource type: ${action.resource}`)
    }
  }

  /**
   * Get HTTP method for action
   */
  private getMethod(action: OfflineAction): string {
    switch (action.type) {
      case 'create': return 'POST'
      case 'update': return 'PUT'
      case 'delete': return 'DELETE'
      case 'move': return 'PATCH'
      case 'share': return 'POST'
      default: return 'POST'
    }
  }

  /**
   * Get auth token from storage
   */
  private getAuthToken(): string {
    // Try to get from session storage first, then local storage
    return sessionStorage.getItem('accessToken') ||
           localStorage.getItem('accessToken') ||
           ''
  }

  /**
   * Handle action execution error
   */
  private async handleActionError(action: OfflineAction, error: any): Promise<void> {
    const isRetryable = this.isRetryableError(error)

    if (isRetryable && action.retries < this.retryPolicy.maxRetries) {
      // Calculate next retry delay
      const delay = Math.min(
        this.retryPolicy.initialDelay * Math.pow(this.retryPolicy.backoffMultiplier, action.retries),
        this.retryPolicy.maxDelay
      )

      // Update action with retry info
      await db.actions.update(action.id, {
        status: 'pending',
        retries: action.retries + 1,
        error: error.message
      })

      // Schedule retry
      setTimeout(() => {
        if (networkMonitor.isOnline()) {
          this.process()
        }
      }, delay)

      console.log(`Action ${action.id} will retry in ${delay}ms (attempt ${action.retries + 1})`)
    } else {
      // Mark as failed
      await db.actions.update(action.id, {
        status: 'failed',
        error: error.message
      })

      // Emit failure event
      this.emit('actionFailed', { action, error })

      console.error(`Action ${action.id} permanently failed:`, error)
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return true
    }

    // HTTP status codes that are retryable
    const retryableStatuses = [408, 429, 500, 502, 503, 504]
    if (error.status && retryableStatuses.includes(error.status)) {
      return true
    }

    // Specific error messages that indicate retry
    const retryableMessages = ['timeout', 'network', 'connection']
    if (error.message) {
      const message = error.message.toLowerCase()
      return retryableMessages.some(msg => message.includes(msg))
    }

    return false
  }

  /**
   * Retry a specific failed action
   */
  async retry(actionId: string): Promise<void> {
    const action = await db.actions.get(actionId)
    if (!action) {
      throw new Error('Action not found')
    }

    if (action.status !== 'failed') {
      throw new Error('Can only retry failed actions')
    }

    // Reset for retry
    await db.actions.update(actionId, {
      status: 'pending',
      retries: 0,
      error: undefined
    })

    // Process if online
    if (networkMonitor.isOnline()) {
      this.process()
    }
  }

  /**
   * Clear actions from queue
   */
  async clear(filter?: (action: OfflineAction) => boolean): Promise<number> {
    if (!filter) {
      // Clear all
      const count = await db.actions.count()
      await db.actions.clear()
      return count
    }

    // Clear with filter
    const actions = await db.actions.toArray()
    const toDelete = actions.filter(filter)
    await db.actions.bulkDelete(toDelete.map(a => a.id))
    return toDelete.length
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number
    pending: number
    processing: number
    failed: number
    byPriority: Record<string, number>
  }> {
    const actions = await db.actions.toArray()

    const stats = {
      total: actions.length,
      pending: 0,
      processing: 0,
      failed: 0,
      byPriority: {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0
      }
    }

    for (const action of actions) {
      stats[action.status]++
      stats.byPriority[action.priority]++
    }

    return stats
  }

  /**
   * Event emitter functionality
   */
  private listeners: Map<string, Set<Function>> = new Map()

  private emit(event: string, data: any): void {
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

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event)
      if (handlers) {
        handlers.delete(handler)
      }
    }
  }

  off(event: string, handler: Function): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }
}

// Create and export singleton instance
export const actionQueue = new OfflineActionQueue()

// React hook for queue status
export function useActionQueue() {
  const [stats, setStats] = React.useState<any>(null)

  React.useEffect(() => {
    const updateStats = async () => {
      const newStats = await actionQueue.getStats()
      setStats(newStats)
    }

    // Update immediately
    updateStats()

    // Listen for changes
    const unsubSuccess = actionQueue.on('actionSuccess', updateStats)
    const unsubFailed = actionQueue.on('actionFailed', updateStats)

    // Update periodically
    const interval = setInterval(updateStats, 5000)

    return () => {
      unsubSuccess()
      unsubFailed()
      clearInterval(interval)
    }
  }, [])

  return {
    stats,
    enqueue: actionQueue.enqueue.bind(actionQueue),
    retry: actionQueue.retry.bind(actionQueue),
    clear: actionQueue.clear.bind(actionQueue),
    process: actionQueue.process.bind(actionQueue)
  }
}

import React from 'react'