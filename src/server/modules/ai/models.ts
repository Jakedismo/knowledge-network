import type { ModelId } from './types'

export const MODEL_FAMILY: readonly ModelId[] = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-codex',
] as const

export interface ModelSpec {
  id: ModelId
  maxTokens: number
  supportsTools: boolean
  streaming: boolean
  description: string
}

export const MODEL_SPECS: Record<ModelId, ModelSpec> = {
  'gpt-5': {
    id: 'gpt-5',
    maxTokens: 200_000,
    supportsTools: true,
    streaming: true,
    description: 'Flagship reasoning model with strong tool-use.'
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    maxTokens: 64_000,
    supportsTools: true,
    streaming: true,
    description: 'Lower-latency, cost-optimized general model.'
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    maxTokens: 16_000,
    supportsTools: false,
    streaming: true,
    description: 'Fastest, smallest model for simple tasks.'
  },
  'gpt-5-codex': {
    id: 'gpt-5-codex',
    maxTokens: 128_000,
    supportsTools: true,
    streaming: true,
    description: 'Code-specialized variant for program synthesis.'
  },
}

export function resolveModel(preferred?: ModelId): ModelId {
  const id = preferred && MODEL_SPECS[preferred] ? preferred : 'gpt-5-mini'
  return id
}

