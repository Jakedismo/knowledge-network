export type UpdateHandler = (update: Uint8Array, origin: unknown) => void
export type Observer<TEvent> = (event: YEvent<TEvent>) => void

class Emitter<TEvent = any> {
  private readonly listeners = new Set<Observer<TEvent>>()

  add(fn: Observer<TEvent>) {
    this.listeners.add(fn)
  }

  remove(fn: Observer<TEvent>) {
    this.listeners.delete(fn)
  }

  emit(event: YEvent<TEvent>) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}

export class Text {
  private value = ''
  private readonly emitter = new Emitter<TextEvent>()

  constructor(private readonly doc: Doc, private readonly field: string) {}

  toString(): string {
    return this.value
  }

  insert(index: number, text: string) {
    if (index < 0) index = 0
    if (index > this.value.length) index = this.value.length
    this.value = this.value.slice(0, index) + text + this.value.slice(index)
    this.doc.emitUpdate(new Uint8Array(), this.doc)
    const delta: TextDelta[] = []
    if (index > 0) delta.push({ retain: index })
    if (text.length > 0) delta.push({ insert: text })
    this.emitter.emit({ target: this, delta })
  }

  delete(index: number, length: number) {
    if (length <= 0) return
    if (index < 0) index = 0
    const actual = Math.min(length, Math.max(0, this.value.length - index))
    if (actual === 0) return
    this.value = this.value.slice(0, index) + this.value.slice(index + actual)
    this.doc.emitUpdate(new Uint8Array(), this.doc)
    const delta: TextDelta[] = []
    if (index > 0) delta.push({ retain: index })
    delta.push({ delete: actual })
    this.emitter.emit({ target: this, delta })
  }

  observe(fn: Observer<TextEvent>) {
    this.emitter.add(fn)
  }

  unobserve(fn: Observer<TextEvent>) {
    this.emitter.remove(fn)
  }
}

export type TextDelta = { retain?: number; insert?: string; delete?: number }
export type TextEvent = TextDelta[]

export interface YEvent<TEvent = any> {
  target: Text
  delta: TEvent extends TextEvent ? TextDelta[] : TEvent
}

export class Doc {
  readonly clientID: number
  private readonly texts = new Map<string, Text>()
  private readonly updateHandlers = new Set<UpdateHandler>()

  constructor() {
    this.clientID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  }

  getText(field = 'content'): Text {
    let existing = this.texts.get(field)
    if (!existing) {
      existing = new Text(this, field)
      this.texts.set(field, existing)
    }
    return existing
  }

  transact(fn: () => void) {
    fn()
  }

  on(event: 'update', handler: UpdateHandler) {
    if (event === 'update') {
      this.updateHandlers.add(handler)
    }
  }

  off(event: 'update', handler: UpdateHandler) {
    if (event === 'update') {
      this.updateHandlers.delete(handler)
    }
  }

  destroy() {
    this.updateHandlers.clear()
    this.texts.clear()
  }

  emitUpdate(update: Uint8Array, origin: unknown) {
    for (const handler of this.updateHandlers) {
      handler(update, origin)
    }
  }
}

export function applyUpdate(doc: Doc, update: Uint8Array, origin?: unknown) {
  doc.emitUpdate(update, origin)
}

export function encodeStateAsUpdate(_doc: Doc): Uint8Array {
  return new Uint8Array()
}

export function encodeStateVector(_doc: Doc): Uint8Array {
  return new Uint8Array()
}

export default {
  Doc,
  Text,
  applyUpdate,
  encodeStateAsUpdate,
  encodeStateVector,
}
