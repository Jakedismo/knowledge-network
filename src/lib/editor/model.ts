import { RopeText, applyOps, type EditOp } from './rope-text'

export type EditorBlock = {
  id: string
  start: number
  end: number
  text: string
  gap: string
  hash: string
}

export type BlockDecoration = {
  id: string
  blockId: string
  type: string
  range?: { start: number; end: number }
  data?: Record<string, unknown>
}

export type EditorSnapshot = {
  version: number
  text: string
  blocks: EditorBlock[]
  decorations: Record<string, BlockDecoration[]>
}

export type EditorChange = {
  version: number
  range: { start: number; end: number }
  blocks: EditorBlock[]
}

type Listener = () => void

export class EditorModel {
  private doc: RopeText
  private version = 0
  private blocks: EditorBlock[] = []
  private textCache: string
  private listeners = new Set<Listener>()
  private snapshot: EditorSnapshot
  private decorations = new Map<string, BlockDecoration[]>()

  constructor(initial: string) {
    this.doc = new RopeText(initial)
    this.textCache = initial
    this.blocks = segmentText(initial)
    this.snapshot = this.makeSnapshot()
  }

  getVersion(): number {
    return this.version
  }

  getText(): string {
    return this.textCache
  }

  /**
   * Replace entire document text. Use sparingly (e.g., initial hydration).
   */
  setText(text: string): void {
    if (text === this.textCache) return
    this.doc = new RopeText(text)
    this.textCache = text
    this.blocks = segmentText(text)
    this.decorations.clear()
    this.bumpVersion({ start: 0, end: text.length })
  }

  getBlocks(): EditorBlock[] {
    return this.blocks
  }

  replaceRange(start: number, end: number, text: string): void {
    if (end < start) [start, end] = [end, start]
    const deleteLen = Math.max(0, end - start)
    if (deleteLen > 0) {
      this.doc.delete(start, deleteLen)
    }
    if (text.length > 0) {
      this.doc.insert(start, text)
    }
    this.rebuildState()
    this.bumpVersion({ start, end: start + text.length })
  }

  applyOps(ops: EditOp[]): void {
    applyOps(this.doc, ops)
    this.rebuildState()
    const range = computeOpsRange(ops)
    this.bumpVersion(range ?? { start: 0, end: this.textCache.length })
  }

  /**
   * Update model based on new user-facing string. Computes diff to minimize work.
   */
  updateFromText(next: string): void {
    if (next === this.textCache) return
    const prev = this.textCache
    const diff = computeDiff(prev, next)
    if (!diff) return

    if (diff.removeLength > 0) {
      this.doc.delete(diff.start, diff.removeLength)
    }
    if (diff.inserted.length > 0) {
      this.doc.insert(diff.start, diff.inserted)
    }
    this.textCache = next
    this.blocks = segmentText(next)
    this.decorations.clear()
    this.bumpVersion({ start: diff.start, end: diff.start + diff.inserted.length })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot(): EditorSnapshot {
    return this.snapshot
  }

  setBlockDecorations(blockId: string, decorations: BlockDecoration[]): void {
    if (decorations.length === 0) {
      this.decorations.delete(blockId)
    } else {
      this.decorations.set(blockId, decorations)
    }
    this.bumpDecorations()
  }

  addBlockDecoration(decoration: BlockDecoration): void {
    const list = this.decorations.get(decoration.blockId) ?? []
    const next = list.filter((d) => d.id !== decoration.id)
    next.push(decoration)
    next.sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0))
    this.decorations.set(decoration.blockId, next)
    this.bumpDecorations()
  }

  clearDecorations(blockId?: string): void {
    if (blockId) {
      this.decorations.delete(blockId)
    } else {
      this.decorations.clear()
    }
    this.bumpDecorations()
  }

  clearDecorationsByType(type: string): void {
    let changed = false
    for (const [blockId, decorations] of this.decorations.entries()) {
      const filtered = decorations.filter((d) => d.type !== type)
      if (filtered.length === 0) {
        if (decorations.length !== 0) {
          this.decorations.delete(blockId)
          changed = true
        }
      } else if (filtered.length !== decorations.length) {
        this.decorations.set(blockId, filtered)
        changed = true
      }
    }
    if (changed) {
      this.bumpDecorations()
    }
  }

  getDecorations(blockId?: string): BlockDecoration[] | Record<string, BlockDecoration[]> {
    if (!blockId) {
      return Object.fromEntries(this.decorations.entries())
    }
    return this.decorations.get(blockId)?.slice() ?? []
  }

  private rebuildState(): void {
    const text = this.doc.toString()
    this.textCache = text
    this.blocks = segmentText(text)
    this.decorations.clear()
  }

  private bumpVersion(range: { start: number; end: number }): void {
    this.version += 1
    this.snapshot = this.makeSnapshot()
    this.notifyListeners()
  }

  private bumpDecorations(): void {
    this.version += 1
    this.snapshot = this.makeSnapshot()
    this.notifyListeners()
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) listener()
  }

  private makeSnapshot(): EditorSnapshot {
    return {
      version: this.version,
      text: this.textCache,
      blocks: this.blocks,
      decorations: Object.fromEntries(this.decorations.entries()),
    }
  }
}

function computeOpsRange(ops: EditOp[]): { start: number; end: number } | null {
  if (ops.length === 0) return null
  let min = Number.POSITIVE_INFINITY
  let max = 0
  for (const op of ops) {
    if (op.t === 'ins') {
      min = Math.min(min, op.at)
      max = Math.max(max, op.at + op.text.length)
    } else {
      min = Math.min(min, op.at)
      max = Math.max(max, op.at + op.len)
    }
  }
  if (!Number.isFinite(min)) return null
  return { start: min, end: max }
}

function segmentText(text: string): EditorBlock[] {
  if (text.length === 0) {
    return [{ id: 'block-0', start: 0, end: 0, text: '', gap: '', hash: hashText('') }]
  }
  const blocks: EditorBlock[] = []
  const regex = /\n{2,}/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let idx = 0
  while ((match = regex.exec(text))) {
    const blockText = text.slice(lastIndex, match.index)
    const gap = match[0]
    const start = lastIndex
    const end = match.index
    blocks.push({
      id: `block-${idx}-${start}`,
      start,
      end,
      text: blockText,
      gap,
      hash: hashText(blockText + gap),
    })
    lastIndex = match.index + match[0].length
    idx += 1
  }
  const tailText = text.slice(lastIndex)
  blocks.push({
    id: `block-${idx}-${lastIndex}`,
    start: lastIndex,
    end: lastIndex + tailText.length,
    text: tailText,
    gap: '',
    hash: hashText(tailText),
  })
  return blocks
}

function hashText(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return `h${(hash >>> 0).toString(16)}`
}

export function computeDiff(
  prev: string,
  next: string
): { start: number; removeLength: number; inserted: string } | null {
  const prevLen = prev.length
  const nextLen = next.length
  let start = 0
  const maxStart = Math.min(prevLen, nextLen)
  while (start < maxStart && prev[start] === next[start]) {
    start += 1
  }
  if (start === prevLen && start === nextLen) {
    return null
  }

  let endPrev = prevLen - 1
  let endNext = nextLen - 1
  while (endPrev >= start && endNext >= start && prev[endPrev] === next[endNext]) {
    endPrev -= 1
    endNext -= 1
  }

  const removed = prev.slice(start, endPrev + 1)
  const inserted = next.slice(start, endNext + 1)
  return {
    start,
    removeLength: removed.length,
    inserted,
  }
}
