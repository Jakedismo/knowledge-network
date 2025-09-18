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
} from './types'

async function postExecute(body: any) {
  const res = await fetch('/api/ai/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI execute failed: ${res.status} ${text}`)
  }
  return (await res.json()) as { outputText?: string }
}

function tryParseJSON<T>(text?: string): T | null {
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

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
    }
    const out = await postExecute({ instructions, input })
    const now = new Date().toISOString()
    const answer = out.outputText ?? ''
    return {
      messages: [
        { id: `u:${now}`, role: 'user', content: turn.input, createdAt: now },
        { id: `a:${now}`, role: 'assistant', content: answer, createdAt: now },
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
    const out = await postExecute({ instructions, input: payload })
    const parsed = tryParseJSON<SuggestionsResponse>(out.outputText)
    if (parsed?.suggestions?.length) return parsed
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
    const out = await postExecute({ instructions, input: req })
    const parsed = tryParseJSON<ResearchResponse>(out.outputText)
    if (parsed?.items?.length) return parsed
    return { items: [] }
  }

  async transcribe(input: { fileName: string; bytes: Uint8Array }): Promise<TranscriptionResult> {
    const fd = new FormData()
    const blob = new Blob([input.bytes], { type: 'application/octet-stream' })
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
    const out = await postExecute({ instructions, input })
    const parsed = tryParseJSON<ContextHelpItem[]>(out.outputText)
    if (Array.isArray(parsed)) return parsed
    return []
  }
}
