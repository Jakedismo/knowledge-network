import { summarize } from '@/server/modules/content-intel/summarize'
import { LocalTranslator } from '@/server/modules/content-intel/translate'
import type { LanguageCode } from '@/server/modules/content-intel/types'

export interface AgentExecuteInput {
  instructions: string
  input: Record<string, unknown>
}

export async function executeAgent(payload: AgentExecuteInput): Promise<{ outputText?: string }> {
  const mode = process.env.OPENAI_AGENTS_MODE || 'local'
  if (mode === 'openai') {
    // Placeholder for future OpenAI Agents SDK integration.
    // For now, fail fast indicating configuration is required.
    throw new Error('OpenAI Agents integration not configured on server. Set OPENAI_AGENTS_MODE=local or implement SDK call.')
  }
  // Local execution path: support simple summarize/translate tasks
  const task = String((payload.input as any)?.task ?? '')
  if (task === 'summarize') {
    const content = String((payload.input as any)?.content ?? '')
    const maxSentences = Number((payload.input as any)?.maxSentences ?? 3)
    const language = ((payload.input as any)?.language ?? 'en') as LanguageCode
    const { summary } = summarize(content, { maxSentences, language })
    return { outputText: summary }
  }
  if (task === 'translate') {
    const translator = new LocalTranslator()
    const content = String((payload.input as any)?.content ?? '')
    const source = ((payload.input as any)?.source ?? 'en') as LanguageCode
    const target = ((payload.input as any)?.target ?? 'en') as LanguageCode
    const t = await translator.translate(content, { source, target })
    return { outputText: t.content }
  }
  return { outputText: '' }
}

