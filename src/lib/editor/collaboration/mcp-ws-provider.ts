import * as Y from 'yjs'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'
import type { CollaborationProvider } from './provider'
import type { JsonRpcMessage, JsonRpcRequest, AckResult, SubscribeParams, UpdateParams, AwarenessParams } from '@/lib/collaboration/mcp'
import { encodeB64, decodeB64 } from '@/lib/collaboration/mcp'

export type WebSocketLike = {
  readyState: number
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void
  close: (code?: number, reason?: string) => void
  addEventListener: (type: 'open' | 'message' | 'close' | 'error', listener: (event: MessageEvent | Event) => void) => void
  removeEventListener: (type: 'open' | 'message' | 'close' | 'error', listener: (event: MessageEvent | Event) => void) => void
}

type ProviderOptions = {
  roomId: string
  url: string
  doc?: Y.Doc
  awareness?: Awareness
  socketFactory?: (url: string, protocols?: string | string[]) => WebSocketLike
  sessionId?: string
  token?: string
  reconnectDelayMs?: number
  onStatus?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void
  useBinary?: boolean
}

export class MCPWebSocketCollaborationProvider implements CollaborationProvider {
  readonly transport = 'websocket' as const
  readonly doc: Y.Doc
  readonly awareness: Awareness
  readonly roomId: string

  private socket: WebSocketLike | null = null
  private destroyed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private readonly socketFactory: (url: string, protocols?: string | string[]) => WebSocketLike
  private readonly url: string
  private readonly sessionId?: string
  private readonly token?: string
  private reconnectDelay: number
  private readonly initialDelay: number
  private readonly maxDelay: number
  private readonly onStatus?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void
  private readonly useBinary: boolean
  private seq = 1

  constructor(options: ProviderOptions) {
    this.roomId = options.roomId
    this.doc = options.doc ?? new Y.Doc()
    this.awareness = options.awareness ?? new Awareness(this.doc)
    this.socketFactory = options.socketFactory ?? ((url: string, protocols?: string | string[]) => new WebSocket(url, protocols))
    this.url = options.url
    this.sessionId = options.sessionId
    this.token = options.token
    this.initialDelay = options.reconnectDelayMs ?? 2000
    this.maxDelay = this.initialDelay * 8
    this.reconnectDelay = this.initialDelay
    this.onStatus = options.onStatus
    this.useBinary = options.useBinary ?? false

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

  private sendJson<M extends string, P>(method: M, params: P): void {
    if (!this.socket || this.socket.readyState !== 1) return
    const msg: JsonRpcRequest<M, P> = { jsonrpc: '2.0', id: `${Date.now()}-${this.seq++}`, method, params }
    try {
      this.socket.send(JSON.stringify(msg))
    } catch {
      // no-op
    }
  }

  private connect(): void {
    if (this.destroyed) return
    this.onStatus?.('connecting')
    const headersParam: Record<string, string> = {}
    if (this.token) headersParam['auth'] = this.token
    if (this.sessionId) headersParam['sid'] = this.sessionId
    const url = new URL(this.url)
    for (const [k, v] of Object.entries(headersParam)) url.searchParams.set(k, v)

    const socket = this.socketFactory(url.toString(), this.useBinary ? 'mcp-binary' : 'mcp-json')
    this.socket = socket

    const onMessage = (event: MessageEvent) => {
      // Binary frames: first byte tags type (optional future use). For now, default to JSON path.
      if (typeof event.data === 'string') {
        this.handleJsonMessage(event.data)
      } else if (event.data instanceof ArrayBuffer) {
        // Future: handle binary envelope; here we treat entire buffer as Yjs update for fast path
        const u8 = new Uint8Array(event.data)
        if (u8.length > 0) {
          Y.applyUpdate(this.doc, u8, this)
        }
      }
    }

    const handleOpen = () => {
      this.onStatus?.('connected')
      this.reconnectDelay = this.initialDelay
      // Subscribe
      const sub: SubscribeParams = {
        roomId: this.roomId,
        sessionId: this.sessionId,
        token: this.token,
        capabilities: ['yjs.update.v1', 'awareness.v1']
      }
      this.sendJson('collab/subscribe', sub)
      // Send sync state
      const update = Y.encodeStateAsUpdate(this.doc)
      const params: UpdateParams = {
        roomId: this.roomId,
        seq: this.seq++,
        payloadB64: encodeB64(update)
      }
      this.sendJson('collab/sync', params)
      // Send initial awareness (if any)
      const aw = encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()))
      if (aw.length) {
        const aparams: AwarenessParams = { roomId: this.roomId, seq: this.seq++, payloadB64: encodeB64(aw) }
        this.sendJson('collab/awareness', aparams)
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

    const onDocUpdate = (update: Uint8Array) => {
      if (this.destroyed) return
      const params: UpdateParams = { roomId: this.roomId, seq: this.seq++, payloadB64: encodeB64(update) }
      this.sendJson('collab/update', params)
    }
    const onAwareness = () => {
      if (this.destroyed) return
      const payload = encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()))
      const params: AwarenessParams = { roomId: this.roomId, seq: this.seq++, payloadB64: encodeB64(payload) }
      this.sendJson('collab/awareness', params)
    }

    this.doc.on('update', onDocUpdate)
    this.awareness.on('update', onAwareness)

    this.cleanup = () => {
      this.doc.off('update', onDocUpdate)
      this.awareness.off('update', onAwareness)
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

  private handleJsonMessage(data: string): void {
    try {
      const msg = JSON.parse(data) as JsonRpcMessage
      if (!msg || typeof msg !== 'object') return
      if ('result' in msg) {
        // Ack/result messages are optional to process here
        return
      }
      if ('method' in msg) {
        const { method, params } = msg
        if (method === 'collab/update' && params && typeof params === 'object') {
          const p = params as { payloadB64?: string }
          if (p.payloadB64) Y.applyUpdate(this.doc, decodeB64(p.payloadB64), this)
        } else if (method === 'collab/awareness' && params && typeof params === 'object') {
          const p = params as { payloadB64?: string }
          if (p.payloadB64) applyAwarenessUpdate(this.awareness, decodeB64(p.payloadB64), this)
        }
      }
    } catch {
      // ignore malformed
    }
  }
}
