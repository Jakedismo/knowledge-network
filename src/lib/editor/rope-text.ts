/**
 * RopeText — lightweight chunked text structure for large-document editing
 * JS fallback for WASM rope core. Optimized for UTF-16 positions as used by DOM/TS.
 */

export class RopeText {
  private chunks: string[]
  private readonly minChunk = 2 * 1024 // 2KB
  private readonly maxChunk = 8 * 1024 // 8KB

  constructor(initial: string = "") {
    this.chunks = []
    if (initial) this.set(initial)
  }

  static from(text: string) {
    return new RopeText(text)
  }

  set(text: string) {
    this.chunks = []
    let i = 0
    while (i < text.length) {
      const end = Math.min(i + this.maxChunk, text.length)
      this.chunks.push(text.slice(i, end))
      i = end
    }
  }

  length(): number {
    // UTF-16 code units length
    let len = 0
    for (const c of this.chunks) len += c.length
    return len
  }

  toString(): string {
    return this.chunks.join("")
  }

  slice(start: number, end: number): string {
    const { ci: si, off: so } = this.locate(start)
    const { ci: ei, off: eo } = this.locate(end)
    if (si === ei) return this.chunks[si].slice(so, eo)
    const out: string[] = [this.chunks[si].slice(so)]
    for (let i = si + 1; i < ei; i++) out.push(this.chunks[i])
    out.push(this.chunks[ei].slice(0, eo))
    return out.join("")
  }

  insert(pos: number, text: string): void {
    if (this.chunks.length === 0) {
      this.chunks.push(text)
      this.rebalanceAround(0)
      return
    }
    const { ci, off } = this.locate(pos)
    const chunk = this.chunks[ci]
    if (chunk === undefined) {
      // Append at end
      this.chunks.push(text)
      this.rebalanceAround(this.chunks.length - 1)
      return
    }
    const left = chunk.slice(0, off)
    const right = chunk.slice(off)
    // Replace current chunk with left + text + right, then rebalance
    this.chunks.splice(ci, 1, left + text + right)
    this.rebalanceAround(ci)
  }

  delete(pos: number, len: number): void {
    if (len <= 0) return
    const end = Math.min(this.length(), pos + len)
    const { ci: si, off: so } = this.locate(pos)
    const { ci: ei, off: eo } = this.locate(end)

    if (si === ei) {
      const c = this.chunks[si]
      this.chunks[si] = c.slice(0, so) + c.slice(eo)
      this.rebalanceAround(si)
      return
    }

    // Trim head and tail, remove middle
    const head = this.chunks[si].slice(0, so)
    const tail = this.chunks[ei].slice(eo)
    this.chunks.splice(si, ei - si + 1, head + tail)
    this.rebalanceAround(si)
  }

  private locate(pos: number): { ci: number; off: number } {
    if (pos <= 0) return { ci: 0, off: 0 }
    let idx = 0
    for (let i = 0; i < this.chunks.length; i++) {
      const L = this.chunks[i].length
      if (idx + L >= pos) return { ci: i, off: pos - idx }
      idx += L
    }
    // End
    const last = Math.max(0, this.chunks.length - 1)
    return { ci: last, off: this.chunks[last]?.length ?? 0 }
  }

  private rebalanceAround(ci: number) {
    // Split large chunk
    const c = this.chunks[ci]
    if (!c) return
    if (c.length > this.maxChunk) {
      const parts: string[] = []
      let i = 0
      while (i < c.length) {
        const end = Math.min(i + this.minChunk, c.length)
        parts.push(c.slice(i, end))
        i = end
      }
      this.chunks.splice(ci, 1, ...parts)
      return
    }
    // Merge tiny neighbors
    if (c.length < this.minChunk && this.chunks[ci + 1]) {
      const nxt = this.chunks[ci + 1]
      if (c.length + nxt.length <= this.maxChunk) {
        this.chunks.splice(ci, 2, c + nxt)
      }
    }
  }
}

export type EditOp =
  | { t: "ins"; at: number; text: string }
  | { t: "del"; at: number; len: number }

export function applyOps(doc: RopeText, ops: EditOp[]) {
  for (const op of ops) {
    if (op.t === "ins") doc.insert(op.at, op.text)
    else doc.delete(op.at, op.len)
  }
  return doc
}
