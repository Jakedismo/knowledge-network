export type AwarenessUpdate = {
  added: number[]
  updated: number[]
  removed: number[]
}

export class Awareness {
  private readonly states = new Map<number, Record<string, unknown>>()
  private readonly listeners = new Map<string, Set<(update: AwarenessUpdate, origin: unknown) => void>>()
  readonly doc: { clientID: number }

  constructor(doc: { clientID: number }) {
    this.doc = doc
  }

  setLocalState(state: Record<string, unknown> | null): void {
    if (state === null) {
      this.states.delete(this.doc.clientID)
      this.emit('update', { added: [], updated: [], removed: [this.doc.clientID] }, this)
    } else {
      const exists = this.states.has(this.doc.clientID)
      this.states.set(this.doc.clientID, state)
      this.emit('update', {
        added: exists ? [] : [this.doc.clientID],
        updated: exists ? [this.doc.clientID] : [],
        removed: [],
      }, this)
    }
  }

  getStates(): Map<number, Record<string, unknown>> {
    return this.states
  }

  on(event: 'update', fn: (update: AwarenessUpdate, origin: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(fn)
  }

  off(event: 'update', fn: (update: AwarenessUpdate, origin: unknown) => void): void {
    this.listeners.get(event)?.delete(fn)
  }

  destroy(): void {
    this.states.clear()
    this.listeners.clear()
  }

  private emit(event: 'update', update: AwarenessUpdate, origin: unknown): void {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    for (const listener of listeners) {
      listener(update, origin)
    }
  }
}

export function encodeAwarenessUpdate(_awareness: Awareness, _clients: number[]): Uint8Array {
  return new Uint8Array()
}

export function applyAwarenessUpdate(_awareness: Awareness, _payload: Uint8Array, _origin: unknown): void {
  // no-op in fallback implementation
}

export function removeAwarenessStates(_awareness: Awareness, clients: number[], origin: unknown): void {
  for (const clientId of clients) {
    _awareness.setLocalState(null)
  }
}
