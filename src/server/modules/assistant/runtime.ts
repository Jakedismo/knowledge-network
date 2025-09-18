import { randomUUID } from 'crypto'
import {
  aiConfig,
  invokeAgent,
  BASE_SYSTEM_PROMPT,
  type AgentInvokeResultChunk,
  type ModelId,
} from '@/server/modules/ai'
import type {
  AssistantContext,
  ChatResponse,
  FactCheckResponse,
  ResearchResponse,
  SuggestionsResponse,
  ContextHelpItem,
} from '@/lib/assistant/types'

export type AssistantCapability = 'chat' | 'suggest' | 'research' | 'context-help' | 'fact-check'

interface AssistantRequestBase {
  userId: string
  workspaceId?: string
  model?: ModelId
  stream?: boolean
  instructionsOverride?: string
}

export interface ChatExecutionRequest extends AssistantRequestBase {
  capability: 'chat'
  input: ChatInputPayload
}

export interface SuggestExecutionRequest extends AssistantRequestBase {
  capability: 'suggest'
  input: SuggestInputPayload
}

export interface ResearchExecutionRequest extends AssistantRequestBase {
  capability: 'research'
  input: ResearchInputPayload
}

export interface ContextHelpExecutionRequest extends AssistantRequestBase {
  capability: 'context-help'
  input: ContextHelpInputPayload
}

export interface FactCheckExecutionRequest extends AssistantRequestBase {
  capability: 'fact-check'
  input: FactCheckInputPayload
}

export type AssistantExecutionRequest =
  | ChatExecutionRequest
  | SuggestExecutionRequest
  | ResearchExecutionRequest
  | ContextHelpExecutionRequest
  | FactCheckExecutionRequest

export type AssistantExecutionResult =
  | { type: 'chat'; data: ChatResponse }
  | { type: 'suggest'; data: SuggestionsResponse }
  | { type: 'research'; data: ResearchResponse }
  | { type: 'context-help'; data: ContextHelpItem[] }
  | { type: 'fact-check'; data: FactCheckResponse }

export async function runAssistantCapability(
  request: AssistantExecutionRequest
): Promise<AssistantExecutionResult> {
  if (!aiConfig.apiKey) throw new Error('AI not configured')

  switch (request.capability) {
    case 'chat':
      return { type: 'chat', data: await runChat(request) }
    case 'suggest':
      return { type: 'suggest', data: await runSuggest(request) }
    case 'research':
      return { type: 'research', data: await runResearch(request) }
    case 'context-help':
      return { type: 'context-help', data: await runContextHelp(request) }
    case 'fact-check':
      return { type: 'fact-check', data: await runFactCheck(request) }
    default:
      throw new Error(`Unsupported assistant capability: ${(request as AssistantExecutionRequest).capability}`)
  }
}

export async function streamChatCapability(
  request: ChatExecutionRequest
): Promise<AsyncIterable<AgentInvokeResultChunk>> {
  if (!aiConfig.apiKey) throw new Error('AI not configured')
  return invokeAgent({
    model: request.model ?? aiConfig.defaultModel,
    system: buildSystemPrompt('chat'),
    instructions: request.instructionsOverride ?? CHAT_INSTRUCTIONS,
    input: buildChatInput(request.input),
    userId: request.userId,
    workspaceId: request.workspaceId,
    stream: true,
  }) as AsyncIterable<AgentInvokeResultChunk>
}

interface ChatInputPayload {
  question: string
  context?: AssistantContext
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

async function runChat(request: ChatExecutionRequest): Promise<ChatResponse> {
  const res = await invokeAgent({
    model: request.model ?? aiConfig.defaultModel,
    system: buildSystemPrompt('chat'),
    instructions: request.instructionsOverride ?? CHAT_INSTRUCTIONS,
    input: buildChatInput(request.input),
    userId: request.userId,
    workspaceId: request.workspaceId,
    stream: false,
  })

  const now = new Date().toISOString()
  const question = request.input.question
  const answer = extractText(res)

  return {
    messages: [
      {
        id: randomUUID(),
        role: 'user',
        content: question,
        createdAt: now,
      },
      {
        id: randomUUID(),
        role: 'assistant',
        content: answer,
        createdAt: now,
      },
    ],
  }
}

interface SuggestInputPayload {
  selection: string
  context?: AssistantContext
}

async function runSuggest(request: SuggestExecutionRequest): Promise<SuggestionsResponse> {
  const res = await invokeAgent({
    model: request.model ?? aiConfig.defaultModel,
    system: buildSystemPrompt('suggest'),
    instructions: request.instructionsOverride ?? SUGGEST_INSTRUCTIONS,
    input: buildSuggestInput(request.input),
    userId: request.userId,
    workspaceId: request.workspaceId,
    stream: false,
  })

  const parsed = safeParseJSON<{
    suggestions?: Array<{ text?: string; kind?: string; confidence?: number }>
  }>(extractText(res))
  const items = Array.isArray(parsed?.suggestions) ? parsed!.suggestions! : []

  const suggestions = items
    .map((item) => ({
      id: randomUUID(),
      kind: normalizeSuggestionKind(item.kind),
      text: (item.text ?? '').toString().trim(),
      confidence: clamp01(typeof item.confidence === 'number' ? item.confidence : 0.5),
    }))
    .filter((item) => item.text.length > 0)

  return { suggestions }
}

interface ResearchInputPayload {
  query: string
  scope?: 'internal' | 'external' | 'both'
  maxItems?: number
}

async function runResearch(request: ResearchExecutionRequest): Promise<ResearchResponse> {
  const res = await invokeAgent({
    model: request.model ?? aiConfig.defaultModel,
    system: buildSystemPrompt('research'),
    instructions: request.instructionsOverride ?? RESEARCH_INSTRUCTIONS,
    input: buildResearchInput(request.input),
    userId: request.userId,
    workspaceId: request.workspaceId,
    stream: false,
  })

  const parsed = safeParseJSON<{
    items?: Array<{ title?: string; snippet?: string; source?: string; url?: string }>
  }>(extractText(res))
  const maxItems = request.input.maxItems ?? 5
  const items = Array.isArray(parsed?.items) ? parsed!.items!.slice(0, maxItems) : []

  return {
    items: items.map((item) => {
      const entry: ResearchResponse['items'][number] = {
        id: randomUUID(),
        title: (item.title ?? 'Result').toString().trim() || 'Result',
        snippet: (item.snippet ?? '').toString().trim(),
        source: normalizeResearchSource(item.source),
      }
      if (item.url) entry.url = item.url.toString()
      return entry
    }),
  }
}

interface ContextHelpInputPayload {
  route?: string
  selectionText?: string
  tags?: string[]
}

async function runContextHelp(request: ContextHelpExecutionRequest): Promise<ContextHelpItem[]> {
  const res = await invokeAgent({
    model: request.model ?? aiConfig.defaultModel,
    system: buildSystemPrompt('context-help'),
    instructions: request.instructionsOverride ?? CONTEXT_HELP_INSTRUCTIONS,
    input: buildContextHelpInput(request.input),
    userId: request.userId,
    workspaceId: request.workspaceId,
    stream: false,
  })

  const parsed = safeParseJSON<Array<{ title?: string; body?: string }>>(extractText(res))
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item) => ({
      id: randomUUID(),
      title: (item.title ?? 'Tip').toString().trim() || 'Tip',
      body: (item.body ?? '').toString().trim(),
    }))
    .filter((item) => item.body.length > 0)
}

interface FactCheckInputPayload {
  claim: string
  documentId?: string
  context?: AssistantContext
}

async function runFactCheck(request: FactCheckExecutionRequest): Promise<FactCheckResponse> {
  const res = await invokeAgent({
    model: request.model ?? aiConfig.defaultModel,
    system: buildSystemPrompt('fact-check'),
    instructions: request.instructionsOverride ?? FACT_CHECK_INSTRUCTIONS,
    input: buildFactCheckInput(request.input),
    userId: request.userId,
    workspaceId: request.workspaceId,
    stream: false,
  })

  const parsed = safeParseJSON<FactCheckResponse>(extractText(res))
  if (parsed?.finding?.status === 'supported' || parsed?.finding?.status === 'contradicted' || parsed?.finding?.status === 'uncertain') {
    return {
      claim: parsed.claim ?? request.input.claim,
      finding: {
        status: parsed.finding.status,
        evidence: Array.isArray(parsed.finding.evidence)
          ? parsed.finding.evidence.slice(0, 5).map((it, idx) => {
              const entry: NonNullable<FactCheckResponse['finding']['evidence']>[number] = {
                id: it?.id ? String(it.id) : randomUUID(),
                title: it?.title ? String(it.title) : `Evidence ${idx + 1}`,
                snippet: it?.snippet ? String(it.snippet) : '',
              }
              if (it?.url) entry.url = String(it.url)
              return entry
            })
          : undefined,
      },
    }
  }

  return {
    claim: request.input.claim,
    finding: {
      status: 'uncertain',
    },
  }
}

const CHAT_INSTRUCTIONS = [
  'You are the Knowledge Network copilot. Prefer calling available tools to search or act on workspace data rather than guessing.',
  'For READ actions (search/list/get), call tools directly. For WRITE actions (create/update/move/delete/attach), first ask for any missing parameters and require explicit confirmation (`confirm=true`) before executing.',
  'When proposing a WRITE, summarize the exact change succinctly then ask: "Proceed?". After confirmation, include confirm=true in the tool call.',
  'When calling apply_template_from_context, include any available context values (selectionText, tags, route, documentId) so the tool can prefill variables. Otherwise, include a `values` object explicitly.',
  'Keep answers ≤ 180 words. Provide clear next steps. Never fabricate workspace data not returned by tools.',
].join(' ')

const SUGGEST_INSTRUCTIONS = [
  'Based on the provided selection and context, produce writing suggestions as JSON object with key "suggestions".',
  'Each suggestion must be {"kind":"rewrite|continue|title|summary|todo|tag","text":"string","confidence": number between 0 and 1}.',
  'Return ONLY JSON, no prose.',
].join(' ')

const RESEARCH_INSTRUCTIONS = [
  'Synthesize insights. Prefer using tools to search workspace when scope includes internal data. Return JSON {"items":[{title,snippet,source:"kb|web",url?}]} ordered by relevance.',
  'If no internal results found, state that explicitly and propose next search parameters.',
  'Return ONLY JSON.',
].join(' ')

const CONTEXT_HELP_INSTRUCTIONS = [
  'Generate 2-3 lightweight contextual tips for the user based on route/selection.',
  'Return an array JSON structure like [{"title":"string","body":"string"}].',
  'Keep bodies ≤ 90 characters. Return ONLY JSON.',
].join(' ')

const FACT_CHECK_INSTRUCTIONS = [
  'Assess the claim and respond with JSON {"claim":"string","finding":{"status":"supported|contradicted|uncertain","evidence":[{id,title,snippet,url?}]}}.',
  'Be conservative; prefer "uncertain" if evidence is inconclusive. Return ONLY JSON.',
].join(' ')

function buildSystemPrompt(mode: AssistantCapability): string {
  const qualifier = {
    chat: 'Deliver empathetic, secure answers grounded in workspace knowledge.',
    suggest: 'You assist with editing guidance and structure improvements.',
    research: 'You are a research analyst synthesizing internal and external knowledge.',
    'context-help': 'You surface contextual onboarding prompts inside the product.',
    'fact-check': 'You verify statements and surface supporting or contradicting evidence.',
  }[mode]
  return `${BASE_SYSTEM_PROMPT}\n${qualifier}`
}

function buildChatInput(payload: ChatInputPayload) {
  return {
    question: payload.question,
    context: compactContext(payload.context),
    history: payload.history ?? [],
  }
}

function buildSuggestInput(payload: SuggestInputPayload) {
  return {
    selection: payload.selection,
    context: compactContext(payload.context),
  }
}

function buildResearchInput(payload: ResearchInputPayload) {
  return {
    query: payload.query,
    scope: payload.scope ?? 'both',
    maxItems: Math.min(Math.max(payload.maxItems ?? 5, 1), 8),
    context: compactContext(payload.context),
  }
}

function buildFactCheckInput(payload: FactCheckInputPayload): Record<string, unknown> {
  const result: Record<string, unknown> = {
    claim: payload.claim,
    context: compactContext(payload.context),
  }
  if (payload.documentId) result.documentId = payload.documentId
  return result
}

function buildContextHelpInput(payload: ContextHelpInputPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (payload.route) out.route = payload.route
  if (payload.selectionText) out.selectionText = payload.selectionText
  if (payload.tags && payload.tags.length) out.tags = payload.tags
  return out
}

function compactContext(context: AssistantContext | undefined): AssistantContext {
  const next: AssistantContext = {}
  if (!context) return next
  if (context.userId) next.userId = context.userId
  if (context.workspaceId) next.workspaceId = context.workspaceId
  if (context.selectionText) next.selectionText = context.selectionText
  if (context.documentId) next.documentId = context.documentId
  if (context.route) next.route = context.route
  if (context.pageTitle) next.pageTitle = context.pageTitle
  if (context.collectionId) next.collectionId = context.collectionId
  if (context.tags && context.tags.length) next.tags = context.tags
   if (typeof context.confirm === 'boolean') next.confirm = context.confirm
  return next
}

function extractText(result: unknown): string {
  if (!result) return ''
  if (typeof (result as any)[Symbol.asyncIterator] === 'function') {
    throw new Error('Streaming result received where non-stream expected')
  }
  const full = result as { outputText?: string }
  return full?.outputText ? String(full.outputText) : ''
}

function safeParseJSON<T>(text: string): T | null {
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function normalizeSuggestionKind(
  kind?: string
): SuggestionsResponse['suggestions'][number]['kind'] {
  const allowed: SuggestionsResponse['suggestions'][number]['kind'][] = [
    'rewrite',
    'continue',
    'title',
    'summary',
    'todo',
    'tag',
  ]
  const normalized = kind?.toLowerCase()
  return (allowed.find((k) => k === normalized) ?? 'rewrite') as SuggestionsResponse['suggestions'][number]['kind']
}

function normalizeResearchSource(source?: string): ResearchResponse['items'][number]['source'] {
  const normalized = source?.toLowerCase()
  if (normalized === 'kb' || normalized === 'internal') return 'kb'
  if (normalized === 'web' || normalized === 'external') return 'web'
  return 'kb'
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0.5
  return Math.min(Math.max(value, 0), 1)
}
