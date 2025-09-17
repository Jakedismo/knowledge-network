import { describe, it, expect } from 'vitest'
import { RopeText } from '../../editor/rope-text'
import { measure } from '../../performance'

function makeDoc(words = 10000): string {
  const base = 'lorem ipsum dolor sit amet consectetur adipiscing elit '
  const times = Math.ceil((words * 6) / base.split(' ').length)
  return Array.from({ length: times }).map(() => base).join('').slice(0, words * 6)
}

const STRICT = process.env.PERF_STRICT === '1'

describe('RopeText performance smoke', () => {
  it('insert/delete scale on 10k words', () => {
    const big = makeDoc(10000)
    const doc = new RopeText(big)
    const L = doc.length()
    const mid = Math.floor(L / 2)

    const ins = measure('insert-1k-mid', () => {
      doc.insert(mid, 'x'.repeat(1000))
      return null
    }).duration

    const del = measure('delete-1k-mid', () => {
      doc.delete(mid, 1000)
      return null
    }).duration

    // Soft thresholds to avoid flakiness on CI. Enable STRICT locally.
    const insBudget = STRICT ? 60 : 200
    const delBudget = STRICT ? 60 : 200
    expect(ins).toBeLessThan(insBudget)
    expect(del).toBeLessThan(delBudget)
  })

  it('typing simulation stays fast', () => {
    const doc = new RopeText('')
    const text = 'The quick brown fox jumps over the lazy dog. '
    let total = 0
    for (let i = 0; i < 200; i++) {
      const { duration } = measure('type-append', () => {
        doc.insert(doc.length(), text)
        return null
      })
      total += duration
    }
    const avg = total / 200
    const budget = STRICT ? 2.5 : 10
    expect(avg).toBeLessThan(budget)
  })
})

