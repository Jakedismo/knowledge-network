import * as Y from 'yjs'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'
import type { ClientMessage, ServerMessage } from './protocol'
import type { VersionStore } from './storage/version-store'

// Minimal connection interface for Bun WebSocket and potential adapters
export interface Connection {
  send(data: string): void
  close(code?: number, reason?: string): void
}

type ConnState = {
  conn: Connection
  // clientIDs observed from this connection's awareness messages
  clientIds: Set<number>
}

export class Room {
  readonly id: string
  readonly doc: Y.Doc
  readonly awareness: Awareness
  private readonly conns = new Set<ConnState>()
  private readonly versionStore: VersionStore
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false

  constructor(id: string, store: VersionStore, initial?: Uint8Array) {
    this.id = id
    this.doc = new Y.Doc()
    if (initial && initial.byteLength > 0) {
      Y.applyUpdate(this.doc, initial)
    }
    this.awareness = new Awareness(this.doc)
    this.versionStore = store

    this.doc.on('update', () => {
      this.dirty = true
      this.scheduleSave()
    })

    // Broadcast awareness updates to everyone except origin
    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      const payload = encodeAwarenessUpdate(this.awareness, added.concat(updated, removed))
      this.broadcast({ type: 'awareness', roomId: this.id, payload: Array.from(payload) }, origin as Connection | undefined)
    })
  }

  connect(conn: Connection): void {
    const state: ConnState = { conn, clientIds: new Set<number>() }
    this.conns.add(state)

    // Send a sync of current state upon connect
    const update = Y.encodeStateAsUpdate(this.doc)
    const message: ServerMessage = { type: 'sync', roomId: this.id, update: Array.from(update) }
    try {
      conn.send(JSON.stringify(message))
    } catch {}
  }

  disconnect(conn: Connection): void {
    const state = [...this.conns].find((s) => s.conn === conn)
    if (!state) return
    this.conns.delete(state)

    if (state.clientIds.size > 0) {
      // Best effort: remove awareness for all clientIds associated with this connection
      try {
        const ids = Array.from(state.clientIds)
        // y-protocols has removeAwarenessStates in impl; use dynamic call if present
        const anyAw = this.awareness as any
        if (typeof anyAw.removeAwarenessStates === 'function') {
          anyAw.removeAwarenessStates(ids, conn)
        } else {
          // Fallback: clear states by setting them to undefined internally
          const states = (this.awareness as any).states as Map<number, any>
          ids.forEach((id) => states?.delete(id))
          // Trigger broadcast with removed ids
          const payload = encodeAwarenessUpdate(this.awareness, ids)
          this.broadcast({ type: 'awareness', roomId: this.id, payload: Array.from(payload) })
        }
      } catch {
        // ignore
      }
    }
  }

  handleMessage(conn: Connection, raw: string): void {
    let msg: ClientMessage | null = null
    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return
      if ((parsed as any).roomId !== this.id) return
      if (!['sync', 'update', 'awareness'].includes((parsed as any).type)) return
      msg = parsed as ClientMessage
    } catch {
      return
    }

    if (msg.type === 'sync' || msg.type === 'update') {
      try {
        Y.applyUpdate(this.doc, Uint8Array.from(msg.update))
      } catch {
        return
      }
      // Broadcast update to others
      this.broadcast({ type: 'update', roomId: this.id, update: msg.update }, conn)
      return
    }

    if (msg.type === 'awareness') {
      try {
        // Track which client ids came from this connection so we can clean up on disconnect
        const before = new Set(this.awareness.getStates().keys())
        applyAwarenessUpdate(this.awareness, Uint8Array.from(msg.payload), conn)
        const after = new Set(this.awareness.getStates().keys())
        for (const id of after) if (!before.has(id)) this.getState(conn).clientIds.add(id)
      } catch {
        // ignore
      }
      return
    }
  }

  private broadcast(message: ServerMessage, except?: Connection): void {
    const data = JSON.stringify(message)
    for (const s of this.conns) {
      if (except && s.conn === except) continue
      try {
        s.conn.send(data)
      } catch {
        // ignore failures
      }
    }
  }

  private scheduleSave() {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = null
      if (!this.dirty) return
      this.dirty = false
      const update = Y.encodeStateAsUpdate(this.doc)
      try {
        await this.versionStore.save(this.id, update, { docClock: this.doc.clock })
      } catch {
        // swallow storage errors; do not impact realtime path
      }
    }, 1500) // debounce window
  }

  private getState(conn: Connection): ConnState {
    let state = [...this.conns].find((s) => s.conn === conn)
    if (!state) {
      state = { conn, clientIds: new Set() }
      this.conns.add(state)
    }
    return state
  }

  getStats() {
    return {
      id: this.id,
      clients: this.conns.size,
      docClock: (this.doc as any).clock ?? 0,
      awareness: this.awareness.getStates().size,
    }
  }
}
