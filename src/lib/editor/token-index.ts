import type { EditorBlock, EditorSnapshot } from './model'
import { logger } from '@/lib/logger'

export type TokenIndex = Map<string, TokenEntry[]>

export type TokenEntry = {
  blockId: string
  positions: number[]
}

type Listener = (payload: { index: TokenIndex; version: number }) => void

type WorkerMessage =
  | {
      type: 'index'
      requestId: number
      tokens: Record<string, TokenEntry[]>
      version: number
    }

type WorkerRequest = {
  type: 'tokenize'
  requestId: number
  blocks: Pick<EditorBlock, 'id' | 'text' | 'gap'>[]
  version: number
}

export class TokenIndexer {
  private worker?: Worker
  private listeners = new Set<Listener>()
  private pendingTimer: number | null = null
  private latestSnapshot: EditorSnapshot | null = null
  private requestId = 0
  private index: TokenIndex = new Map()

  constructor() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return
    try {
      this.worker = new Worker(new URL('./tokenizer.worker.ts', import.meta.url), { type: 'module' })
    } catch (err) {
      logger.warn('[TokenIndexer] Worker unavailable, falling back to noop.', err as any)
      this.worker = undefined
      return
    }
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data
      if (!msg || msg.type !== 'index') return
      this.index = hydrateIndex(msg.tokens)
      for (const listener of this.listeners) listener({ index: this.index, version: msg.version })
    }
  }

  schedule(snapshot: EditorSnapshot): void {
    this.latestSnapshot = snapshot
    if (!this.worker) return
    if (this.pendingTimer !== null) return
    this.pendingTimer = window.setTimeout(() => {
      this.flush()
    }, 120)
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    if (this.index.size > 0) {
      listener({ index: this.index, version: this.latestSnapshot?.version ?? 0 })
    }
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer)
      this.pendingTimer = null
    }
    this.worker?.terminate()
    this.listeners.clear()
  }

  private flush(): void {
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer)
      this.pendingTimer = null
    }
    if (!this.worker || !this.latestSnapshot) return
    const request: WorkerRequest = {
      type: 'tokenize',
      requestId: ++this.requestId,
      version: this.latestSnapshot.version,
      blocks: this.latestSnapshot.blocks.map((b) => ({ id: b.id, text: b.text, gap: b.gap })),
    }
    this.worker.postMessage(request)
  }
}

function hydrateIndex(data: Record<string, TokenEntry[]>): TokenIndex {
  const map: TokenIndex = new Map()
  for (const [token, entries] of Object.entries(data)) {
    map.set(token, entries)
  }
  return map
}
