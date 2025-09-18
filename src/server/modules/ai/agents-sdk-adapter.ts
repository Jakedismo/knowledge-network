import type { AgentInvokeFullResult, AgentInvokeInput } from './types'
import { BASE_SYSTEM_PROMPT } from './prompt'

export async function runWithAgentsSDK(input: AgentInvokeInput): Promise<AgentInvokeFullResult> {
  // Dynamically import so the project works without the dependency installed
  let Agent: any, run: any
  try {
    const mod = await import('@openai/agents')
    Agent = (mod as any).Agent
    run = (mod as any).run
  } catch (err) {
    throw new Error("Agents SDK not installed. Install '@openai/agents' to enable this path.")
  }

  const agent = new Agent({
    name: 'KnowledgeNet Backend Agent',
    instructions: input.system ?? BASE_SYSTEM_PROMPT,
    model: input.model ?? 'gpt-5-mini',
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
