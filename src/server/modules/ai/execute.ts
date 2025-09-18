import { summarize } from '@/server/modules/content-intel/summarize'
import { LocalTranslator } from '@/server/modules/content-intel/translate'
import type { LanguageCode } from '@/server/modules/content-intel/types'
import { aiConfig, invokeAgent, BASE_SYSTEM_PROMPT, type ModelId } from '@/server/modules/ai'

export interface AgentExecuteInput {
  instructions?: string
  input: Record<string, unknown>
  userId?: string
  workspaceId?: string
  model?: ModelId
}

export async function executeAgent(payload: AgentExecuteInput): Promise<{ outputText?: string }> {
  const modeEnv = (process.env.OPENAI_AGENTS_MODE ?? '').toLowerCase()
  const preferAgents = modeEnv === 'openai' || (modeEnv !== 'local' && Boolean(aiConfig.apiKey))

  if (preferAgents && aiConfig.apiKey) {
    try {
      const res = await invokeAgent({
        model: payload.model ?? aiConfig.defaultModel,
        system: BASE_SYSTEM_PROMPT,
        instructions: payload.instructions ?? inferInstructions(payload),
        input: payload.input,
        userId: payload.userId ?? inferUserId(payload),
        workspaceId: payload.workspaceId,
        stream: false,
      })
      const full = res as { outputText?: string }
      return { outputText: full?.outputText ?? '' }
    } catch (err) {
      if (modeEnv === 'openai') throw err
      // Fall back to local execution when agents path fails and local mode is allowed.
    }
  }

  return runLocalAgentFallback(payload)
}

async function runLocalAgentFallback(payload: AgentExecuteInput): Promise<{ outputText?: string }> {
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

function inferInstructions(payload: AgentExecuteInput): string {
  if (payload.instructions) return payload.instructions
  const task = String((payload.input as any)?.task ?? '')
  switch (task) {
    case 'summarize':
      return 'Summarize the provided content in the requested language. Limit to concise prose.'
    case 'translate':
      return 'Translate the input text to the requested target language. Respond with only the translated text.'
    default:
      return 'Process the provided input and respond succinctly.'
  }
}

function inferUserId(payload: AgentExecuteInput): string {
  const task = String((payload.input as any)?.task ?? 'generic')
  return `agent:${task}`
}
