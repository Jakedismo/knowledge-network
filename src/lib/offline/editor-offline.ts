import { db, type Document } from './db'
import { networkMonitor } from './network-monitor'
import { actionQueue } from './action-queue'
import { syncEngine } from './sync-engine'
import type { Operation } from './sync-engine'
import { v4 as uuidv4 } from 'uuid'

export interface OfflineEditorState {
  documentId: string
  content: string
  cursorPosition: number
  selections: Selection[]
  unsavedChanges: Operation[]
  lastSaved: Date
  autoSaveTimer?: NodeJS.Timeout
}

export interface Selection {
  start: number
  end: number
  userId?: string
}

export class OfflineEditor {
  private state: OfflineEditorState | null = null
  private autoSaveInterval = 1000 // 1 second offline, 3 seconds online
  private debounceTimer?: NodeJS.Timeout
  private listeners = new Map<string, Set<Function>>()
  private userId: string

  constructor(userId?: string) {
    this.userId = userId || this.generateUserId()
    this.setupAutoSave()
    this.setupNetworkListeners()
  }

  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private setupAutoSave() {
    // Adjust auto-save interval based on network state
    networkMonitor.on('stateChange', ({ to }) => {
      if (to === 'offline') {
        this.autoSaveInterval = 1000 // More frequent offline saves
      } else {
        this.autoSaveInterval = 3000 // Less frequent online saves
      }
    })
  }

  private setupNetworkListeners() {
    // Sync when coming back online
    networkMonitor.on('online', () => {
      if (this.state) {
        this.syncDocument()
      }
    })
  }

  /**
   * Initialize editor with a document
   */
  async initialize(documentId: string): Promise<void> {
    // Load from IndexedDB if exists
    let document = await db.documents.get(documentId)

    if (!document && networkMonitor.isOnline()) {
      // Fetch from server if online
      document = await this.fetchDocument(documentId)
      if (document) {
        await db.documents.add(document)
      }
    }

    if (!document) {
      // Create new document
      document = {
        id: documentId,
        workspaceId: 'default',
        title: 'New Document',
        content: '',
        version: 1,
        lastModified: new Date(),
        syncStatus: 'pending'
      }
      await db.documents.add(document)
    }

    // Initialize state
    this.state = {
      documentId,
      content: document.content,
      cursorPosition: 0,
      selections: [],
      unsavedChanges: [],
      lastSaved: document.lastModified
    }

    // Start auto-save
    this.startAutoSave()

    // Emit initialized event
    this.emit('initialized', { documentId, content: document.content })
  }

  /**
   * Fetch document from server
   */
  private async fetchDocument(documentId: string): Promise<Document | null> {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return {
        id: data.id,
        workspaceId: data.workspaceId,
        collectionId: data.collectionId,
        title: data.title,
        content: data.content,
        version: data.version || 1,
        lastModified: new Date(data.lastModified),
        syncStatus: 'synced'
      }
    } catch (error) {
      console.error('Failed to fetch document:', error)
      return null
    }
  }

  /**
   * Handle content change
   */
  async handleChange(content: string, cursorPosition?: number): Promise<void> {
    if (!this.state) return

    const oldContent = this.state.content
    const operation: Operation = {
      type: 'update',
      content,
      timestamp: new Date(),
      userId: this.userId
    }

    // Update state
    this.state.content = content
    if (cursorPosition !== undefined) {
      this.state.cursorPosition = cursorPosition
    }
    this.state.unsavedChanges.push(operation)

    // Debounce save
    this.debounceSave()

    // Emit change event
    this.emit('change', { content, cursorPosition })
  }

  /**
   * Handle text insertion
   */
  async handleInsert(position: number, text: string): Promise<void> {
    if (!this.state) return

    const operation: Operation = {
      type: 'insert',
      position,
      content: text,
      timestamp: new Date(),
      userId: this.userId
    }

    // Update content
    this.state.content =
      this.state.content.slice(0, position) +
      text +
      this.state.content.slice(position)

    this.state.cursorPosition = position + text.length
    this.state.unsavedChanges.push(operation)

    // Debounce save
    this.debounceSave()

    // Emit change
    this.emit('insert', { position, text })
  }

  /**
   * Handle text deletion
   */
  async handleDelete(position: number, length: number): Promise<void> {
    if (!this.state) return

    const operation: Operation = {
      type: 'delete',
      position,
      attributes: { length },
      timestamp: new Date(),
      userId: this.userId
    }

    // Update content
    this.state.content =
      this.state.content.slice(0, position) +
      this.state.content.slice(position + length)

    this.state.cursorPosition = position
    this.state.unsavedChanges.push(operation)

    // Debounce save
    this.debounceSave()

    // Emit change
    this.emit('delete', { position, length })
  }

  /**
   * Debounce save operation
   */
  private debounceSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.save()
    }, 500)
  }

  /**
   * Save to local storage
   */
  async save(): Promise<void> {
    if (!this.state || this.state.unsavedChanges.length === 0) {
      return
    }

    try {
      // Save to IndexedDB
      await db.documents.update(this.state.documentId, {
        content: this.state.content,
        lastModified: new Date(),
        syncStatus: 'pending',
        localChanges: this.state.unsavedChanges
      })

      // Clear unsaved changes
      this.state.unsavedChanges = []
      this.state.lastSaved = new Date()

      // If online, queue for sync
      if (networkMonitor.isOnline()) {
        await actionQueue.enqueue({
          type: 'update',
          resource: 'document',
          resourceId: this.state.documentId,
          payload: {
            content: this.state.content
          }
        })
      }

      // Emit save event
      this.emit('saved', { documentId: this.state.documentId })
    } catch (error) {
      console.error('Failed to save document:', error)
      this.emit('saveError', error)
    }
  }

  /**
   * Start auto-save
   */
  private startAutoSave(): void {
    this.stopAutoSave()

    if (this.state) {
      this.state.autoSaveTimer = setInterval(() => {
        if (this.state && this.state.unsavedChanges.length > 0) {
          this.save()
        }
      }, this.autoSaveInterval)
    }
  }

  /**
   * Stop auto-save
   */
  private stopAutoSave(): void {
    if (this.state?.autoSaveTimer) {
      clearInterval(this.state.autoSaveTimer)
      this.state.autoSaveTimer = undefined
    }
  }

  /**
   * Sync document with server
   */
  async syncDocument(): Promise<void> {
    if (!this.state) return

    try {
      await syncEngine.syncDocument(this.state.documentId)

      // Reload document after sync
      const document = await db.documents.get(this.state.documentId)
      if (document) {
        this.state.content = document.content
        this.state.unsavedChanges = []
        this.emit('synced', { documentId: this.state.documentId })
      }
    } catch (error) {
      console.error('Sync failed:', error)
      this.emit('syncError', error)
    }
  }

  /**
   * Handle selection change
   */
  handleSelectionChange(selection: Selection): void {
    if (!this.state) return

    // Update local selection
    this.state.selections = [selection]

    // Emit selection event
    this.emit('selection', selection)
  }

  /**
   * Get current content
   */
  getContent(): string {
    return this.state?.content || ''
  }

  /**
   * Get save status
   */
  getSaveStatus(): {
    hasUnsavedChanges: boolean
    lastSaved: Date | null
    syncStatus: 'synced' | 'pending' | 'conflict' | 'offline'
  } {
    if (!this.state) {
      return {
        hasUnsavedChanges: false,
        lastSaved: null,
        syncStatus: 'offline'
      }
    }

    const status = networkMonitor.isOffline()
      ? 'offline'
      : this.state.unsavedChanges.length > 0
        ? 'pending'
        : 'synced'

    return {
      hasUnsavedChanges: this.state.unsavedChanges.length > 0,
      lastSaved: this.state.lastSaved,
      syncStatus: status
    }
  }

  /**
   * Export document for backup
   */
  async exportDocument(): Promise<{
    id: string
    content: string
    metadata: any
  }> {
    if (!this.state) {
      throw new Error('No document loaded')
    }

    const document = await db.documents.get(this.state.documentId)

    return {
      id: this.state.documentId,
      content: this.state.content,
      metadata: {
        title: document?.title,
        version: document?.version,
        lastModified: document?.lastModified,
        exportedAt: new Date()
      }
    }
  }

  /**
   * Import document from backup
   */
  async importDocument(data: { id: string, content: string, metadata?: any }): Promise<void> {
    const document: Document = {
      id: data.id,
      workspaceId: 'default',
      title: data.metadata?.title || 'Imported Document',
      content: data.content,
      version: 1,
      lastModified: new Date(),
      syncStatus: 'pending',
      metadata: data.metadata
    }

    await db.documents.put(document)
    await this.initialize(data.id)
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
   * Event emitter
   */
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
    this.stopAutoSave()
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.listeners.clear()
    this.state = null
  }
}

// React hook for offline editor
export function useOfflineEditor(documentId: string) {
  const [editor, setEditor] = React.useState<OfflineEditor | null>(null)
  const [content, setContent] = React.useState('')
  const [saveStatus, setSaveStatus] = React.useState<any>({})
  const [isInitialized, setIsInitialized] = React.useState(false)

  React.useEffect(() => {
    const editorInstance = new OfflineEditor()

    // Setup event listeners
    const unsubInitialized = editorInstance.on('initialized', (data: any) => {
      setContent(data.content)
      setIsInitialized(true)
    })

    const unsubChange = editorInstance.on('change', (data: any) => {
      setContent(data.content)
    })

    const unsubSaved = editorInstance.on('saved', () => {
      setSaveStatus(editorInstance.getSaveStatus())
    })

    const unsubSynced = editorInstance.on('synced', () => {
      setSaveStatus(editorInstance.getSaveStatus())
    })

    // Initialize
    editorInstance.initialize(documentId).then(() => {
      setEditor(editorInstance)
    })

    // Update save status periodically
    const statusInterval = setInterval(() => {
      if (editorInstance) {
        setSaveStatus(editorInstance.getSaveStatus())
      }
    }, 1000)

    return () => {
      unsubInitialized()
      unsubChange()
      unsubSaved()
      unsubSynced()
      clearInterval(statusInterval)
      editorInstance.destroy()
    }
  }, [documentId])

  return {
    editor,
    content,
    saveStatus,
    isInitialized,
    handleChange: (content: string) => editor?.handleChange(content),
    handleInsert: (position: number, text: string) => editor?.handleInsert(position, text),
    handleDelete: (position: number, length: number) => editor?.handleDelete(position, length),
    save: () => editor?.save(),
    sync: () => editor?.syncDocument()
  }
}

import React from 'react'