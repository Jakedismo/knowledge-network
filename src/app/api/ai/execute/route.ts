import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { aiConfig, type AgentInvokeResultChunk } from '@/server/modules/ai'
import { requireAIAccess } from '@/server/modules/ai/policy'
import {
  runAssistantCapability,
  streamChatCapability,
  type AssistantCapability,
  type ChatExecutionRequest,
  type SuggestExecutionRequest,
  type ResearchExecutionRequest,
  type ContextHelpExecutionRequest,
  type FactCheckExecutionRequest,
} from '@/server/modules/assistant/runtime'
import type { AssistantContext } from '@/lib/assistant/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireAIAccess(req, { permission: 'ai:invoke' })
  if (guard instanceof Response) return guard
  if (!aiConfig.apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const capability = String(body?.capability ?? 'chat') as AssistantCapability

  const createChatRequest = (): ChatExecutionRequest => {
    const request: ChatExecutionRequest = {
      capability: 'chat',
      userId: guard.userId,
      input: normalizeChatInput(body?.input ?? {}),
    }
    if (guard.workspaceId) request.workspaceId = guard.workspaceId
    if (body?.model) request.model = body.model
    if (body?.instructions) request.instructionsOverride = body.instructions
    return request
  }

  const createSuggestRequest = (): SuggestExecutionRequest => {
    const request: SuggestExecutionRequest = {
      capability: 'suggest',
      userId: guard.userId,
      input: normalizeSuggestInput(body?.input ?? {}),
    }
    if (guard.workspaceId) request.workspaceId = guard.workspaceId
    if (body?.model) request.model = body.model
    if (body?.instructions) request.instructionsOverride = body.instructions
    return request
  }

  const createResearchRequest = (): ResearchExecutionRequest => {
    const request: ResearchExecutionRequest = {
      capability: 'research',
      userId: guard.userId,
      input: normalizeResearchInput(body?.input ?? {}),
    }
    if (guard.workspaceId) request.workspaceId = guard.workspaceId
    if (body?.model) request.model = body.model
    if (body?.instructions) request.instructionsOverride = body.instructions
    return request
  }

  const createContextHelpRequest = (): ContextHelpExecutionRequest => {
    const request: ContextHelpExecutionRequest = {
      capability: 'context-help',
      userId: guard.userId,
      input: normalizeContextHelpInput(body?.input ?? {}),
    }
    if (guard.workspaceId) request.workspaceId = guard.workspaceId
    if (body?.model) request.model = body.model
    if (body?.instructions) request.instructionsOverride = body.instructions
    return request
  }

  const createFactCheckRequest = (): FactCheckExecutionRequest => {
    const request: FactCheckExecutionRequest = {
      capability: 'fact-check',
      userId: guard.userId,
      input: normalizeFactCheckInput(body?.input ?? {}),
    }
    if (guard.workspaceId) request.workspaceId = guard.workspaceId
    if (body?.model) request.model = body.model
    if (body?.instructions) request.instructionsOverride = body.instructions
    return request
  }

  if (capability === 'chat' && body?.stream === true) {
    try {
      const iterator = await streamChatCapability({ ...createChatRequest(), stream: true })
      const encoder = new TextEncoder()
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of iterator) {
              const payload = buildSSEPayload(chunk)
              if (payload) controller.enqueue(encoder.encode(payload))
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Stream error'
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`))
          } finally {
            controller.enqueue(encoder.encode('event: done\ndata: null\n\n'))
            controller.close()
          }
        },
      })
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } catch (err) {
      // Fall back to non-streaming execution below
    }
  }

  try {
    const request = (() => {
      switch (capability) {
        case 'chat':
          return createChatRequest()
        case 'suggest':
          return createSuggestRequest()
        case 'research':
          return createResearchRequest()
        case 'context-help':
          return createContextHelpRequest()
        case 'fact-check':
          return createFactCheckRequest()
        default:
          throw new Error(`Unsupported capability: ${capability}`)
      }
    })()
    const result = await runAssistantCapability(request)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Assistant execution failed' }, { status: 400 })
  }
}

function normalizeChatInput(input: Record<string, unknown>) {
  const history = Array.isArray(input?.history)
    ? input.history
        .map((turn: any) => ({
          role: turn?.role === 'assistant' ? 'assistant' : 'user',
          content: String(turn?.content ?? ''),
        }))
        .filter((turn) => turn.content.length > 0)
    : []
  return {
    question: String(input?.question ?? ''),
    context: sanitizeContext(input?.context),
    history,
  }
}

function normalizeSuggestInput(input: Record<string, unknown>) {
  return {
    selection: String(input?.selection ?? ''),
    context: sanitizeContext(input?.context),
  }
}

function normalizeResearchInput(input: Record<string, unknown>) {
  const scope = input?.scope === 'internal' || input?.scope === 'external' ? input.scope : 'both'
  const maxItemsRaw = Number(input?.maxItems ?? 5)
  const maxItems = Number.isFinite(maxItemsRaw) ? Math.max(1, Math.min(8, maxItemsRaw)) : 5
  return {
    query: String(input?.query ?? ''),
    scope,
    maxItems,
    context: sanitizeContext(input?.context),
  }
}

function normalizeContextHelpInput(input: Record<string, unknown>) {
  const payload: ContextHelpExecutionRequest['input'] = {}
  if (typeof input?.route === 'string' && input.route.trim()) payload.route = input.route
  if (typeof input?.selectionText === 'string' && input.selectionText.trim()) payload.selectionText = input.selectionText
  if (Array.isArray(input?.tags)) payload.tags = input.tags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  return payload
}

function normalizeFactCheckInput(input: Record<string, unknown>) {
  const payload: FactCheckExecutionRequest['input'] = {
    claim: String(input?.claim ?? ''),
    context: sanitizeContext(input?.context),
  }
  if (typeof input?.documentId === 'string' && input.documentId.trim()) payload.documentId = input.documentId
  return payload
}

function sanitizeContext(input: unknown): AssistantContext {
  const ctx: AssistantContext = {}
  if (!input || typeof input !== 'object') return ctx
  const candidate = input as Record<string, unknown>
  if (typeof candidate.userId === 'string' && candidate.userId.trim()) ctx.userId = candidate.userId
  if (typeof candidate.workspaceId === 'string' && candidate.workspaceId.trim()) ctx.workspaceId = candidate.workspaceId
  if (typeof candidate.selectionText === 'string' && candidate.selectionText.trim()) ctx.selectionText = candidate.selectionText
  if (typeof candidate.documentId === 'string' && candidate.documentId.trim()) ctx.documentId = candidate.documentId
  if (typeof candidate.route === 'string' && candidate.route.trim()) ctx.route = candidate.route
  if (Array.isArray(candidate.tags)) {
    const tags = candidate.tags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    if (tags.length) ctx.tags = tags
  }
  if (typeof candidate.confirm === 'boolean') ctx.confirm = candidate.confirm
  return ctx
}

function buildSSEPayload(chunk: AgentInvokeResultChunk): string | null {
  switch (chunk.type) {
    case 'text':
      return `event: text\ndata: ${JSON.stringify(chunk.data)}\n\n`
    case 'error':
      return `event: error\ndata: ${JSON.stringify(chunk.data)}\n\n`
    case 'done':
      return 'event: done\ndata: null\n\n'
    default:
      return null
  }
}
