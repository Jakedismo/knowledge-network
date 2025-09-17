import { describe, it, expect } from 'vitest'
import { selectionLineSegmentsMonospace } from '@/lib/editor/geometry'

describe('selectionLineSegmentsMonospace', () => {
  const text = [
    'Hello world',
    'This is line two',
    'And three',
  ].join('\n')

  it('single-line segment', () => {
    const segs = selectionLineSegmentsMonospace(text, 2, 7)
    expect(segs).toEqual([{ row: 0, x: 2, width: 5 }])
  })

  it('multi-line segment spanning three lines', () => {
    // select from index near end of line 0 to middle of line 2
    const start = 9 // in line 0
    const end = text.indexOf('three') + 3 // inside line 2
    const segs = selectionLineSegmentsMonospace(text, start, end)
    expect(segs.length).toBe(3)
    expect(segs[0].row).toBe(0)
    expect(segs[1].row).toBe(1)
    expect(segs[2].row).toBe(2)
    // widths are positive
    expect(segs.every((s) => s.width > 0)).toBe(true)
  })

  it('handles reversed ranges', () => {
    const segs = selectionLineSegmentsMonospace(text, 20, 5)
    expect(segs.length).toBeGreaterThan(0)
  })
})

