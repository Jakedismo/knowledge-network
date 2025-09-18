import { describe, it, expect } from 'vitest'
import { summarize } from '@/server/modules/content-intel/summarize'

describe('summarize', () => {
  it('returns top sentences', () => {
    const text = 'Knowledge graphs are structured representations of facts. They help connect entities. This improves search and discovery for users.'
    const { summary, ranked } = summarize(text, { maxSentences: 2, language: 'en' })
    expect(summary.length).toBeGreaterThan(10)
    expect(ranked.length).toBe(3)
  })
})

