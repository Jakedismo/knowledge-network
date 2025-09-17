import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'
import type { CollaborationProvider } from './provider'
import { logger } from '@/lib/logger'

export type WebSocketLike = {
  readyState: number
  send: (data: string) => void
  close: () => void
  addEventListener: (type: 'open' | 'message' | 'close' | 'error', listener: (event: MessageEvent | Event) => void) => void
  removeEventListener: (type: 'open' | 'message' | 'close' | 'error', listener: (event: MessageEvent | Event) => void) => void
}

type ProviderOptions = {
  roomId: string
  url: string
  doc?: Y.Doc
  awareness?: Awareness
  socketFactory?: (url: string) => WebSocketLike
  token?: string
  reconnectDelayMs?: number
  onStatus?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void
}

type SocketMessage =
  | { type: 'sync'; roomId: string; update: number[] }
  | { type: 'update'; roomId: string; update: number[] }
  | { type: 'awareness'; roomId: string; payload: number[] }

export class WebSocketCollaborationProvider implements CollaborationProvider {
  readonly transport = 'websocket' as const
  readonly doc: Y.Doc
  readonly awareness: Awareness
  readonly roomId: string

  private socket: WebSocketLike | null = null
  private destroyed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private readonly socketFactory: (url: string) => WebSocketLike
  private readonly baseUrl: string
  private readonly token?: string
  private reconnectDelay: number
  private readonly initialDelay: number
  private readonly maxDelay: number
  private readonly onStatus?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void

  constructor(options: ProviderOptions) {
    this.roomId = options.roomId
    this.doc = options.doc ?? new Y.Doc()
    this.awareness = options.awareness ?? new Awareness(this.doc)
    this.socketFactory = options.socketFactory ?? ((url: string) => new WebSocket(url))
    this.baseUrl = options.url
    this.token = options.token
    this.initialDelay = options.reconnectDelayMs ?? 2000
    this.maxDelay = this.initialDelay * 8
    this.reconnectDelay = this.initialDelay
    this.onStatus = options.onStatus

    this.connect()
  }

  private cleanup: () => void = () => {}

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.onStatus?.('disconnected')
    this.cleanup()
    this.awareness.destroy()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
  }

  private send(message: SocketMessage): void {
    if (!this.socket || this.socket.readyState !== 1) return
    try {
      this.socket.send(JSON.stringify(message))
    } catch (err) {
      logger.warn('[Collaboration] Failed to send message', err as any)
    }
  }

  private connect(): void {
    if (this.destroyed) return
    this.onStatus?.('connecting')
    const url = this.buildUrl()
    const socket = this.socketFactory(url)
    this.socket = socket

    const broadcastUpdate = (update: Uint8Array) => {
      if (this.destroyed) return
      this.send({ type: 'update', roomId: this.roomId, update: Array.from(update) })
    }

    const broadcastAwareness = () => {
      if (this.destroyed) return
      const payload = Array.from(encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys())))
      this.send({ type: 'awareness', roomId: this.roomId, payload })
    }

    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(typeof event.data === 'string' ? event.data : '') as SocketMessage
        if (!data || data.roomId !== this.roomId) return
        if (data.type === 'update' || data.type === 'sync') {
          Y.applyUpdate(this.doc, Uint8Array.from(data.update), this)
        } else if (data.type === 'awareness') {
          applyAwarenessUpdate(this.awareness, Uint8Array.from(data.payload), this)
        }
      } catch (err) {
        logger.warn('[Collaboration] Unexpected WebSocket message', err as any)
      }
    }

    const handleOpen = () => {
      this.onStatus?.('connected')
      this.reconnectDelay = this.initialDelay
      const update = Array.from(Y.encodeStateAsUpdate(this.doc))
      this.send({ type: 'sync', roomId: this.roomId, update })
      const awarenessPayload = Array.from(
        encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()))
      )
      if (awarenessPayload.length > 0) {
        this.send({ type: 'awareness', roomId: this.roomId, payload: awarenessPayload })
      }
    }

    const handleClose = () => {
      if (this.destroyed) return
      this.onStatus?.('disconnected')
      this.scheduleReconnect()
    }

    const handleError = () => {
      this.onStatus?.('error')
    }

    socket.addEventListener('open', handleOpen)
    socket.addEventListener('close', handleClose)
    socket.addEventListener('error', handleError)
    socket.addEventListener('message', onMessage)

    this.doc.on('update', broadcastUpdate)
    this.awareness.on('update', broadcastAwareness)

    this.cleanup = () => {
      this.doc.off('update', broadcastUpdate)
      this.awareness.off('update', broadcastAwareness)
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('open', handleOpen)
      socket.removeEventListener('close', handleClose)
      socket.removeEventListener('error', handleError)
      socket.close()
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
    }, this.reconnectDelay)
  }

  private buildUrl(): string {
    if (!this.token) return this.baseUrl
    const url = new URL(this.baseUrl)
    url.searchParams.set('token', this.token)
    return url.toString()
  }
}
