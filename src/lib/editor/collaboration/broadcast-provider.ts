import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'
import type { CollaborationProvider } from './provider'

type BroadcastMessage =
  | {
      type: 'update'
      payload: Uint8Array
      origin: number
    }
  | {
      type: 'awareness'
      payload: Uint8Array
      origin: number
    }

export type BroadcastProviderOptions = {
  roomId: string
  doc?: Y.Doc
  channel?: BroadcastChannel
  awareness?: Awareness
}

export class BroadcastCollaborationProvider implements CollaborationProvider {
  readonly doc: Y.Doc
  readonly awareness: Awareness
  readonly roomId: string
  readonly transport = 'broadcast' as const

  private channel: BroadcastChannel | null
  private destroyed = false
  private readonly origin: number

  constructor(options: BroadcastProviderOptions) {
    this.roomId = options.roomId
    this.doc = options.doc ?? new Y.Doc()
    this.awareness = options.awareness ?? new Awareness(this.doc)
    this.channel = null
    this.origin = this.doc.clientID

    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      this.channel = options.channel ?? new BroadcastChannel(`kn-editor-room-${this.roomId}`)
      this.channel.onmessage = (event) => this.handleMessage(event.data as BroadcastMessage)
    }

    this.doc.on('update', (update, origin) => {
      if (origin === this || !this.channel || this.destroyed) return
      this.channel.postMessage({ type: 'update', payload: update, origin: this.origin } satisfies BroadcastMessage)
    })

    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      if ((!added.length && !updated.length && !removed.length) || origin === this || !this.channel || this.destroyed) {
        return
      }
      const payload = encodeAwarenessUpdate(this.awareness, added.concat(updated, removed))
      this.channel.postMessage({ type: 'awareness', payload, origin: this.origin } satisfies BroadcastMessage)
    })
  }

  setLocalState(state: Record<string, unknown>): void {
    this.awareness.setLocalState(state)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.channel?.close()
    this.channel = null
    this.awareness.destroy()
  }

  private handleMessage(message: BroadcastMessage): void {
    if (message.origin === this.origin) return
    if (message.type === 'update') {
      Y.applyUpdate(this.doc, message.payload, this)
    } else if (message.type === 'awareness') {
      applyAwarenessUpdate(this.awareness, message.payload, this)
    }
  }
}
// @ts-nocheck
