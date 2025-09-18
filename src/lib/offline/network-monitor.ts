import { EventEmitter } from 'events'

export enum ConnectionState {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SLOW = 'slow',        // < 1Mbps
  LIMITED = 'limited'   // Save data mode
}

export interface NetworkStatus {
  state: ConnectionState
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  timestamp: Date
}

export class NetworkMonitor extends EventEmitter {
  private state: ConnectionState = ConnectionState.ONLINE
  private listeners = new Set<(status: NetworkStatus) => void>()
  private connection: any // NetworkInformation API
  private checkInterval?: NodeJS.Timeout
  private lastCheck: Date = new Date()

  constructor() {
    super()
    this.initialize()
  }

  private initialize() {
    // Detect initial state
    this.detectInitialState()

    // Setup event listeners
    this.setupEventListeners()

    // Start quality monitoring
    this.startQualityMonitoring()

    // Request persistent storage
    this.requestPersistentStorage()
  }

  private detectInitialState() {
    if (typeof navigator === 'undefined') {
      this.updateState(ConnectionState.ONLINE)
      return
    }

    if (!navigator.onLine) {
      this.updateState(ConnectionState.OFFLINE)
    } else {
      this.measureConnectionQuality()
    }
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return

    // Online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Network Information API (if available)
    if ('connection' in navigator) {
      this.connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection

      if (this.connection) {
        this.connection.addEventListener('change', this.handleConnectionChange)
      }
    }

    // Page visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

    // Service worker message
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage)
    }
  }

  private handleOnline = () => {
    this.measureConnectionQuality()
    this.emit('online')
  }

  private handleOffline = () => {
    this.updateState(ConnectionState.OFFLINE)
    this.emit('offline')
  }

  private handleConnectionChange = () => {
    this.measureConnectionQuality()
  }

  private handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      // Page became visible, check connection
      this.measureConnectionQuality()
    }
  }

  private handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data.type === 'NETWORK_STATUS') {
      this.updateState(event.data.state)
    }
  }

  private measureConnectionQuality() {
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      this.updateState(ConnectionState.OFFLINE)
      return
    }

    // Check Network Information API
    if (this.connection) {
      const { effectiveType, downlink, rtt, saveData } = this.connection

      // Determine state based on connection quality
      if (saveData) {
        this.updateState(ConnectionState.LIMITED)
      } else if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        this.updateState(ConnectionState.SLOW)
      } else if (downlink && downlink < 1) {
        this.updateState(ConnectionState.SLOW)
      } else {
        this.updateState(ConnectionState.ONLINE)
      }

      // Emit detailed status
      this.emitStatus({
        state: this.state,
        effectiveType,
        downlink,
        rtt,
        saveData,
        timestamp: new Date()
      })
    } else {
      // Fallback: simple speed test
      this.performSpeedTest()
    }
  }

  private async performSpeedTest() {
    try {
      // Use a small image or API endpoint for speed testing
      const testUrl = '/api/health' // Should return quickly
      const startTime = performance.now()

      const response = await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-cache'
      })

      const endTime = performance.now()
      const latency = endTime - startTime

      if (!response.ok) {
        this.updateState(ConnectionState.OFFLINE)
      } else if (latency > 3000) {
        this.updateState(ConnectionState.SLOW)
      } else {
        this.updateState(ConnectionState.ONLINE)
      }

      this.emitStatus({
        state: this.state,
        rtt: latency,
        timestamp: new Date()
      })
    } catch (error) {
      this.updateState(ConnectionState.OFFLINE)
    }
  }

  private startQualityMonitoring() {
    // Check connection quality every 30 seconds
    this.checkInterval = setInterval(() => {
      if (navigator.onLine) {
        this.measureConnectionQuality()
      }
    }, 30000)
  }

  private updateState(newState: ConnectionState) {
    if (this.state !== newState) {
      const oldState = this.state
      this.state = newState
      this.emit('stateChange', { from: oldState, to: newState })

      // Log state change
      console.log(`Network state changed: ${oldState} → ${newState}`)
    }
  }

  private emitStatus(status: NetworkStatus) {
    this.listeners.forEach(listener => listener(status))
    this.emit('status', status)
  }

  private async requestPersistentStorage() {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persisted()
      if (!isPersisted) {
        const result = await navigator.storage.persist()
        console.log(`Persistent storage ${result ? 'granted' : 'denied'}`)
      }
    }
  }

  // Public API
  public getState(): ConnectionState {
    return this.state
  }

  public isOnline(): boolean {
    return this.state === ConnectionState.ONLINE
  }

  public isOffline(): boolean {
    return this.state === ConnectionState.OFFLINE
  }

  public isSlow(): boolean {
    return this.state === ConnectionState.SLOW
  }

  public isLimited(): boolean {
    return this.state === ConnectionState.LIMITED
  }

  public onStatusChange(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  public async checkNow(): Promise<NetworkStatus> {
    await this.measureConnectionQuality()
    return {
      state: this.state,
      timestamp: new Date()
    }
  }

  public destroy() {
    // Cleanup
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }

    if (this.connection) {
      this.connection.removeEventListener('change', this.handleConnectionChange)
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.listeners.clear()
    this.removeAllListeners()
  }

  // Singleton pattern
  private static instance: NetworkMonitor

  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor()
    }
    return NetworkMonitor.instance
  }
}

// React hook for using network status
export function useNetworkStatus() {
  if (typeof window === 'undefined') {
    return {
      state: ConnectionState.ONLINE,
      isOnline: true,
      isOffline: false,
      isSlow: false,
      isLimited: false
    }
  }

  const monitor = NetworkMonitor.getInstance()
  const [status, setStatus] = React.useState<NetworkStatus>({
    state: monitor.getState(),
    timestamp: new Date()
  })

  React.useEffect(() => {
    const unsubscribe = monitor.onStatusChange(setStatus)

    // Get initial status
    monitor.checkNow().then(setStatus)

    return unsubscribe
  }, [])

  return {
    ...status,
    isOnline: status.state === ConnectionState.ONLINE,
    isOffline: status.state === ConnectionState.OFFLINE,
    isSlow: status.state === ConnectionState.SLOW,
    isLimited: status.state === ConnectionState.LIMITED
  }
}

// Utility function to wait for online status
export function waitForOnline(): Promise<void> {
  const monitor = NetworkMonitor.getInstance()

  if (monitor.isOnline()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const handler = () => {
      if (monitor.isOnline()) {
        monitor.off('online', handler)
        resolve()
      }
    }
    monitor.on('online', handler)
  })
}

// Export singleton instance (lazy initialization)
export const networkMonitor = typeof window !== 'undefined'
  ? NetworkMonitor.getInstance()
  : null as any

import React from 'react'