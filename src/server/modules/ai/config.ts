import { AIConfig, ModelId } from './types'

const DEFAULT_MODEL: ModelId = (process.env.AI_DEFAULT_MODEL as ModelId) ?? 'gpt-5-mini'

export const aiConfig: AIConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: process.env.OPENAI_BASE_URL,
  organizationId: process.env.OPENAI_ORG_ID,
  defaultModel: DEFAULT_MODEL,
  requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 60_000),
  rateLimitPerMinute: Number(process.env.AI_RPM ?? 30),
}

export function assertAIConfigured(): void {
  if (!aiConfig.apiKey) {
    throw new Error('AI not configured: missing OPENAI_API_KEY')
  }
}

