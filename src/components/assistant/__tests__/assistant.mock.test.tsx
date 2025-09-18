import { describe, it, expect } from 'vitest'
import { MockAssistantProvider } from '@/lib/assistant/mockProvider'

describe('MockAssistantProvider', () => {
  const provider = new MockAssistantProvider()

  it('produces deterministic chat replies', async () => {
    const res = await provider.chat({ input: 'Hello', context: { documentId: 'doc-1' } })
    expect(res.messages[1]?.content).toContain('concise answer')
    const res2 = await provider.chat({ input: 'Hello', context: { documentId: 'doc-1' } })
    expect(res.messages[1]?.id).toBe(res2.messages[1]?.id)
  })

  it('suggests rewrite and title', async () => {
    const res = await provider.suggest({ text: 'This is some selected text.' })
    const kinds = res.suggestions.map((s) => s.kind)
    expect(kinds).toContain('rewrite')
    expect(kinds).toContain('title')
  })

  it('fact-check returns supported by default', async () => {
    const res = await provider.factCheck({ claim: 'The sky is blue' })
    expect(res.finding.status).toBe('supported')
  })
})

