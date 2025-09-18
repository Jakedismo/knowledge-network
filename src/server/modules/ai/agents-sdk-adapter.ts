import type { AgentInvokeFullResult, AgentInvokeInput, AgentInvokeResultChunk } from './types'
import { BASE_SYSTEM_PROMPT } from './prompt'
import { buildWorkspaceAgentTools } from './tools'

export async function runWithAgentsSDK(input: AgentInvokeInput): Promise<AgentInvokeFullResult> {
  // Dynamically import so the project works without the dependency installed
  let Agent: any, run: any, toTool: any
  try {
    const mod = await import('@openai/agents')
    Agent = (mod as any).Agent
    run = (mod as any).run
    toTool = (mod as any).toTool ?? (mod as any).tool
  } catch (err) {
    throw new Error("Agents SDK not installed. Install '@openai/agents' to enable this path.")
  }

  const tools = buildWorkspaceAgentTools()
  const agent = new Agent({
    name: 'KnowledgeNet Backend Agent',
    instructions: input.system ?? BASE_SYSTEM_PROMPT,
    model: input.model ?? 'gpt-5-mini',
    tools: tools.map((t) =>
      toTool({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
        execute: async (args: any) => t.execute(args, { userId: input.userId, workspaceId: input.workspaceId }),
      })
    ),
  })

  const content = typeof input.input === 'string' ? input.input : JSON.stringify(input.input ?? {})

  const result = await run(agent, content, {
    // Minimal, pass metadata in context for tools/guardrails later
    context: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      traceId: input.traceId,
    },
  })

  return {
    outputText: result?.finalOutput ?? String(result ?? ''),
    model: (agent as any).model ?? (input.model ?? 'gpt-5-mini'),
    usage: undefined,
  }
}

export async function runWithAgentsSDKStream(input: AgentInvokeInput): Promise<AsyncIterable<AgentInvokeResultChunk>> {
  let Agent: any, run: any, toTool: any
  try {
    const mod = await import('@openai/agents')
    Agent = (mod as any).Agent
    run = (mod as any).run
    toTool = (mod as any).toTool ?? (mod as any).tool
  } catch (err) {
    async function* errorGen() {
      yield { type: 'error', data: { message: "Agents SDK not installed for streaming" } }
      yield { type: 'done', data: null }
    }
    return errorGen()
  }

  const tools = buildWorkspaceAgentTools()
  const agent = new Agent({
    name: 'KnowledgeNet Backend Agent',
    instructions: input.system ?? BASE_SYSTEM_PROMPT,
    model: input.model ?? 'gpt-5-mini',
    tools: tools.map((t) =>
      toTool({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
        execute: async (args: any) => t.execute(args, { userId: input.userId, workspaceId: input.workspaceId }),
      })
    ),
  })

  const content = typeof input.input === 'string' ? input.input : JSON.stringify(input.input ?? {})

  const stream = await run(agent, content, {
    stream: true,
    context: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      traceId: input.traceId,
    },
  })

  // Prefer text stream for incremental output
  const textStream = (stream as any).toTextStream?.({ compatibleWithNodeStreams: true })

  async function* generator(): AsyncIterable<AgentInvokeResultChunk> {
    try {
      if (textStream && typeof (textStream as any)[Symbol.asyncIterator] === 'function') {
        for await (const chunk of textStream as AsyncIterable<string | Buffer>) {
          const s = typeof chunk === 'string' ? chunk : Buffer.from(chunk as Buffer).toString('utf8')
          if (s) yield { type: 'text', data: s }
        }
        yield { type: 'done', data: null }
        return
      }
      // Fallback: iterate raw events and attempt to extract text fields
      for await (const event of stream as AsyncIterable<any>) {
        const t = (event?.delta?.text ?? event?.text ?? event?.data ?? '') as string
        if (t) yield { type: 'text', data: t }
      }
      yield { type: 'done', data: null }
    } catch (error) {
      const e = error as any
      yield { type: 'error', data: { message: e?.message ?? 'stream error' } }
      yield { type: 'done', data: null }
    }
  }
  return generator()
}
