import type {
  AssistantProvider,
  AssistantProviderOptions,
  ChatResponse,
  ChatTurn,
  SuggestionsResponse,
  FactCheckClaim,
  FactCheckResponse,
  ResearchRequest,
  ResearchResponse,
  TranscriptionResult,
  ContextHelpRequest,
  ContextHelpItem,
  AssistantContext,
} from './types'

export class AgentsAssistantProvider implements AssistantProvider {
  constructor(_opts?: Partial<AssistantProviderOptions>) {}

  async chat(turn: ChatTurn): Promise<ChatResponse> {
    const instructions = [
      'You are a knowledge assistant for a documentation/wiki product.',
      'Answer concisely (<= 120 words) using only provided or known context.',
      'If uncertain, ask a brief clarifying question.',
    ].join(' ')
    const input = {
      question: turn.input,
      context: turn.context ?? {},
      history: turn.history ?? [],
    }
    const out = await callAssistant<{ type: 'chat'; data: ChatResponse }>({ capability: 'chat', input, instructions })
    if (out?.type === 'chat' && out.data?.messages?.length) return out.data
    const now = new Date().toISOString()
    return {
      messages: [
        { id: `u:${now}`, role: 'user', content: turn.input, createdAt: now },
        { id: `a:${now}`, role: 'assistant', content: 'I had trouble generating a response. Please try again.', createdAt: now },
      ],
    }
  }

  async suggest(input: { text: string; context?: any }): Promise<SuggestionsResponse> {
    const instructions = [
      'Given the selected text and context, propose 3 writing suggestions as JSON array under key "suggestions".',
      'Each item: {"id":"string","kind":"rewrite|continue|title|summary|todo|tag","text":"string","confidence": number }',
      'Return ONLY JSON.',
    ].join(' ')
    const payload = { selection: input.text, context: input.context ?? {} }
    const out = await callAssistant<{ type: 'suggest'; data: SuggestionsResponse }>({ capability: 'suggest', input: payload, instructions })
    if (out?.type === 'suggest' && out.data?.suggestions?.length) return out.data
    // Fallback: minimal suggestion
    return { suggestions: [{ id: 'fallback', kind: 'rewrite', text: 'Clarify the selection.', confidence: 0.5 }] as any }
  }

  async factCheck(input: FactCheckClaim): Promise<FactCheckResponse> {
    const res = await fetch('/api/ai/fact-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Fact-check failed: ${res.status} ${text}`)
    }
    return (await res.json()) as FactCheckResponse
  }

  async research(req: ResearchRequest): Promise<ResearchResponse> {
    const instructions = [
      'Conduct brief research and return JSON {items:[{id,title,snippet,source:"kb|web",url?}]}',
      'If no external web tools are configured, prefer internal KB or summaries.',
      'Return ONLY JSON.',
    ].join(' ')
    const out = await callAssistant<{ type: 'research'; data: ResearchResponse }>({ capability: 'research', input: req, instructions })
    if (out?.type === 'research' && out.data?.items?.length) return out.data
    return { items: [] }
  }

  async transcribe(input: { fileName: string; bytes: Uint8Array; context?: AssistantContext }): Promise<TranscriptionResult> {
    const fd = new FormData()
    const view = input.bytes
    const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    fd.set('file', new File([blob], input.fileName))
    const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Transcribe failed: ${res.status} ${text}`)
    }
    const data = (await res.json()) as TranscriptionResult
    return data
  }

  async contextHelp(input: ContextHelpRequest): Promise<ContextHelpItem[]> {
    const instructions = [
      'Given current route and optional selectionText, return 2-3 concise help tips as JSON array [{id,title,body}].',
      'Keep each body < 100 chars. Return ONLY JSON.',
    ].join(' ')
    const out = await callAssistant<{ type: 'context-help'; data: ContextHelpItem[] }>({ capability: 'context-help', input, instructions })
    if (out?.type === 'context-help' && Array.isArray(out.data)) return out.data
    return []
  }
}

async function callAssistant<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ai/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI execute failed: ${res.status} ${text}`)
  }
  return (await res.json()) as T
}
