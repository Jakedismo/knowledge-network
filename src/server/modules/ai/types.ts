export type ModelId =
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-5-nano'
  | 'gpt-5-codex'

export interface AIConfig {
  apiKey?: string
  baseUrl?: string
  defaultModel: ModelId
  requestTimeoutMs: number
  rateLimitPerMinute: number
  organizationId?: string
}

export interface AgentInvokeInput<Vars extends Record<string, unknown> = Record<string, unknown>> {
  model?: ModelId
  system?: string
  instructions?: string
  promptVars?: Vars
  input?: string | Record<string, unknown>
  userId: string
  workspaceId?: string
  traceId?: string
  stream?: boolean
}

export interface AgentInvokeResultChunk {
  type: 'text' | 'tool' | 'error' | 'done'
  data: unknown
}

export interface AgentInvokeFullResult {
  outputText?: string
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  model: ModelId
}

export type AgentInvoker = (
  input: AgentInvokeInput
) => AsyncIterable<AgentInvokeResultChunk> | Promise<AgentInvokeFullResult>

