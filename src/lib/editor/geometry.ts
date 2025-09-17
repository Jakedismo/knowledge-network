export type Segment = { row: number; x: number; width: number }

/**
 * Compute selection segments for monospace rendering (DOM-free).
 * x/width are in character units when cw=1; multiply by char width in px for UI.
 */
export function selectionLineSegmentsMonospace(text: string, start: number, end: number): Segment[] {
  const a = Math.max(0, Math.min(start, end))
  const b = Math.max(a, Math.max(start, end))
  const rowA = countLines(text, a)
  const rowB = countLines(text, b)
  const lineStartA = lastLineStart(text, a)
  const lineStartB = lastLineStart(text, b)

  if (rowA === rowB) {
    return [{ row: rowA, x: a - lineStartA, width: Math.max(1, b - a) }]
  }
  const segs: Segment[] = []
  // first line tail
  const endOfLineA = lineEnd(text, a)
  segs.push({ row: rowA, x: a - lineStartA, width: Math.max(1, endOfLineA - a) })
  // middle full lines
  for (let r = rowA + 1; r < rowB; r++) {
    const s = nthLineStart(text, r)
    const e = nthLineStart(text, r + 1)
    segs.push({ row: r, x: 0, width: Math.max(1, e - s - 1) })
  }
  // last line head
  segs.push({ row: rowB, x: 0, width: Math.max(1, b - lineStartB) })
  return segs
}

export function countLines(text: string, index: number): number {
  let count = 0
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') count += 1
  return count
}

export function lastLineStart(text: string, index: number): number {
  const p = text.lastIndexOf('\n', index - 1)
  return p === -1 ? 0 : p + 1
}

export function nthLineStart(text: string, n: number): number {
  if (n === 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      seen += 1
      if (seen === n) return i + 1
    }
  }
  return text.length
}

function lineEnd(text: string, index: number): number {
  const p = text.indexOf('\n', index)
  return p === -1 ? text.length : p
}

