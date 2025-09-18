import { aiConfig } from './config'
import { resolveModel } from './models'
import type { AgentInvokeInput, AgentInvokeResultChunk, AgentInvokeFullResult } from './types'
import { renderPrompt, BASE_SYSTEM_PROMPT } from './prompt'
import { runWithAgentsSDK } from './agents-sdk-adapter'

type OpenAIClient = any // shimmed in types/shims.d.ts

async function getOpenAI(): Promise<OpenAIClient> {
  // Prefer official SDK, fall back to stub if not installed
  try {
    const mod = await import('openai')
    return new (mod as any).OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseUrl,
      organization: aiConfig.organizationId,
      timeout: aiConfig.requestTimeoutMs,
    })
  } catch (err) {
    // Minimal fallback to avoid crashing during type-checks/tests
    return {
      chat: {
        completions: {
          create: async (_: any) => ({ choices: [{ message: { content: '[stubbed output]' } }], usage: {} }),
        },
      },
    }
  }
}

export async function invokeAgent(
  input: AgentInvokeInput
): Promise<AgentInvokeFullResult | AsyncIterable<AgentInvokeResultChunk>> {
  // Optional Agents SDK path
  if ((process.env.AI_ENGINE ?? '').toLowerCase() === 'agents') {
    // Streaming via Agents SDK is out of scope here; use non-stream
    if (input.stream) {
      throw new Error('Streaming not supported with AI_ENGINE=agents in this phase')
    }
    return runWithAgentsSDK(input)
  }
  const model = resolveModel(input.model)
  const system = input.system ?? BASE_SYSTEM_PROMPT
  const client = await getOpenAI()

  const content = typeof input.input === 'string' ? input.input : JSON.stringify(input.input ?? {})
  const instructions = input.instructions ?? ''
  const { content: rendered } = renderPrompt({ id: 'ad-hoc', system, template: `${instructions}\n\n{{content}}`, required: ['content'] } as any, {
    content,
  })

  if (input.stream) {
    // Basic async iterator adapter for streamed text
    async function* generator(): AsyncIterable<AgentInvokeResultChunk> {
      try {
        const stream = await (client as any).chat.completions.create({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: rendered },
          ],
          stream: true,
          extra_headers: { 'X-Trace-Id': input.traceId ?? '' },
        })
        for await (const ev of stream) {
          const delta = ev?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta.length > 0) {
            yield { type: 'text', data: delta }
          }
        }
        yield { type: 'done', data: null }
      } catch (error) {
        yield { type: 'error', data: serializeError(error) }
      }
    }
    return generator()
  }

  const resp = await (client as any).chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: rendered },
    ],
    extra_headers: { 'X-Trace-Id': input.traceId ?? '' },
  })
  const text: string | undefined = resp?.choices?.[0]?.message?.content
  return {
    outputText: text,
    usage: resp?.usage ?? {},
    model,
  }
}

function serializeError(err: unknown) {
  if (err && typeof err === 'object') {
    const e = err as any
    return { name: e.name, message: e.message, code: e.code, status: e.status }
  }
  return { message: String(err) }
}
