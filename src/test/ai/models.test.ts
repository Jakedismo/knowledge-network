import { describe, it, expect } from 'vitest'
import { resolveModel, MODEL_SPECS } from '@/server/modules/ai/models'

describe('models', () => {
  it('resolves preferred when known', () => {
    const m = resolveModel('gpt-5')
    expect(MODEL_SPECS[m]).toBeTruthy()
  })
  it('falls back when unknown', () => {
    const m = resolveModel('nope' as any)
    expect(m).toBe('gpt-5-mini')
  })
})

