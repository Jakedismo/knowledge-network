// Assistant feature contracts for Swarm 4C (UI-only scope)
// Focused on deterministic, provider-agnostic types and results

export type AssistantRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: AssistantRole
  content: string
  createdAt: string // ISO string for determinism
  facts?: Array<{ id: string; title: string; url?: string }>
}

export interface ChatTurn {
  input: string
  context?: AssistantContext
  history?: Array<{ role: Exclude<AssistantRole, 'system'>; content: string }>
}

export interface AssistantContext {
  userId?: string | undefined
  workspaceId?: string | undefined
  selectionText?: string | undefined
  documentId?: string | undefined
  route?: string | undefined
  pageTitle?: string | undefined
  collectionId?: string | undefined
  tags?: string[] | undefined
  confirm?: boolean | undefined
}

export interface ChatResponse {
  messages: ChatMessage[]
  citations?: Array<{ id: string; title: string; url?: string }>
}

export interface SuggestionItem {
  id: string
  kind: 'rewrite' | 'continue' | 'title' | 'summary' | 'todo' | 'tag'
  text: string
  confidence: number // 0..1
}

export interface SuggestionsResponse {
  suggestions: SuggestionItem[]
}

export interface FactCheckClaim {
  claim: string
  documentId?: string | undefined
  context?: AssistantContext
}

export interface FactCheckFinding {
  status: 'supported' | 'contradicted' | 'uncertain'
  evidence?: Array<{ id: string; title: string; snippet: string; url?: string }>
}

export interface FactCheckResponse {
  claim: string
  finding: FactCheckFinding
}

export interface ResearchRequest {
  query: string
  scope: 'internal' | 'external' | 'both'
  maxItems?: number
  context?: AssistantContext
}

export interface ResearchItem {
  id: string
  title: string
  snippet: string
  source: 'kb' | 'web'
  url?: string
}

export interface ResearchResponse {
  items: ResearchItem[]
}

export interface TranscriptionResult {
  transcript: string
  actionItems: Array<{ id: string; text: string; owner?: string; due?: string }>
  summary?: string
}

export interface ContextHelpRequest {
  route?: string | undefined
  selectionText?: string | undefined
  tags?: string[] | undefined
}

export interface ContextHelpItem {
  id: string
  title: string
  body: string
}

export interface AssistantProvider {
  chat(turn: ChatTurn): Promise<ChatResponse>
  suggest(input: { text: string; context?: AssistantContext }): Promise<SuggestionsResponse>
  factCheck(input: FactCheckClaim): Promise<FactCheckResponse>
  research(input: ResearchRequest): Promise<ResearchResponse>
  transcribe(input: { fileName: string; bytes: Uint8Array; context?: AssistantContext }): Promise<TranscriptionResult>
  contextHelp(input: ContextHelpRequest): Promise<ContextHelpItem[]>
}

export interface AssistantProviderOptions {
  mode: 'mock' | 'agents' | 'mcp'
}
