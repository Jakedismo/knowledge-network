import { describe, expect, it } from 'vitest'
import { rangesOverlap } from '../ConflictBanner'

describe('rangesOverlap', () => {
  it('detects simple overlap', () => {
    expect(rangesOverlap({ start: 2, end: 5 }, { start: 4, end: 8 })).toBe(true)
  })
  it('detects edge-touching as no overlap', () => {
    expect(rangesOverlap({ start: 2, end: 4 }, { start: 4, end: 6 })).toBe(false)
  })
  it('detects containment', () => {
    expect(rangesOverlap({ start: 3, end: 10 }, { start: 4, end: 6 })).toBe(true)
  })
  it('handles reversed ranges', () => {
    expect(rangesOverlap({ start: 10, end: 3 }, { start: 6, end: 4 })).toBe(true)
  })
})

