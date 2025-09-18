import { describe, it, expect } from 'vitest'
import { contentIntelligenceService } from '@/server/modules/content-intel/analyze.service'

describe('ContentIntelligenceService.analyze', () => {
  it('produces summary, tags, entities, readability, sentiment', async () => {
    const content = `Hello world! Knowledge graphs connect entities like People, Places, and Products. Visit https://example.com for more info. Contact us at info@example.com.`
    const res = await contentIntelligenceService.analyze({ content, title: 'Knowledge Graphs Overview', maxTags: 5, maxSummarySentences: 2, targetLanguage: 'es' })
    expect(res.summary).toBeTypeOf('string')
    expect(res.keywords.length).toBeGreaterThan(0)
    expect(res.tags.length).toBeGreaterThan(0)
    expect(res.entities.some((e) => e.type === 'URL')).toBe(true)
    expect(res.readability.words).toBeGreaterThan(0)
    expect(typeof res.quality.score).toBe('number')
    expect(res.sentiment).toHaveProperty('score')
    expect(res.language.language).toBeTypeOf('string')
    expect(res.translation?.language).toBe('es')
  })
})

