import { describe, it, expect } from 'vitest'
import { renderPrompt } from '@/server/modules/ai/prompt'

describe('renderPrompt', () => {
  it('replaces variables and leaves unknown empty', () => {
    const { content } = renderPrompt({ id: 't1', template: 'Hello {{name}} from {{org}}' }, { name: 'Ada' } as any)
    expect(content).toBe('Hello Ada from ')
  })

  it('throws on missing required', () => {
    expect(() => renderPrompt({ id: 't2', template: 'x', required: ['must'] as any }, {})).toThrow()
  })
})

