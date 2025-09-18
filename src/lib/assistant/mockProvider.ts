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

function iso(date: Date) {
  return new Date(date.getTime() - date.getMilliseconds()).toISOString()
}

function deterministicId(seed: string) {
  // Simple FNV-1a like hash → hex id (deterministic, no randomness)
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16)
}

export class MockAssistantProvider implements AssistantProvider {
  constructor(_opts?: Partial<AssistantProviderOptions>) {}

  async chat(turn: ChatTurn): Promise<ChatResponse> {
    const now = iso(new Date('2025-01-01T00:00:00.000Z'))
    const id = deterministicId(turn.input + (turn.context?.documentId || ''))
    const reply = `Here’s a concise answer based on your context$${turn.context?.selectionText ? ' and the selected text' : ''}. For authoritative details, open Fact Check.`.replace('$', '')
    return {
      messages: [
        { id: deterministicId('u:' + id), role: 'user', content: turn.input, createdAt: now },
        { id: deterministicId('a:' + id), role: 'assistant', content: reply, createdAt: now },
      ],
      citations: turn.context?.documentId
        ? [{ id: turn.context.documentId, title: 'Current Document' }]
        : [],
    }
  }

  async suggest(input: { text: string }): Promise<SuggestionsResponse> {
    const base = input.text.trim().slice(0, 40)
    return {
      suggestions: [
        { id: deterministicId(base + ':rewrite'), kind: 'rewrite', text: `Rewrite for clarity: ${base}…`, confidence: 0.82 },
        { id: deterministicId(base + ':title'), kind: 'title', text: `Draft title: ${base || 'Untitled note'}`, confidence: 0.77 },
        { id: deterministicId(base + ':todo'), kind: 'todo', text: 'Add acceptance criteria and owner.', confidence: 0.64 },
      ],
    }
  }

  async factCheck(input: FactCheckClaim): Promise<FactCheckResponse> {
    const status: FactCheckResponse['finding']['status'] = input.claim.toLowerCase().includes('always')
      ? 'uncertain'
      : 'supported'
    const response: FactCheckResponse = {
      claim: input.claim,
      finding: {
        status,
      },
    }
    if (input.documentId) {
      response.finding.evidence = [
        {
          id: input.documentId,
          title: 'Current Document',
          snippet: 'Evidence matched from the active document.',
        },
      ]
    }
    return response
  }

  async research(req: ResearchRequest): Promise<ResearchResponse> {
    const items: ResearchResponse['items'] = []
    const n = Math.max(1, Math.min(req.maxItems ?? 3, 5))
    for (let i = 1; i <= n; i++) {
      items.push({
        id: deterministicId(req.query + ':' + i + ':' + req.scope),
        title: `${req.query} — ${req.scope} result ${i}`,
        snippet: 'Deterministic placeholder; replace with provider-backed results.',
        source: req.scope === 'internal' ? 'kb' : req.scope === 'external' ? 'web' : i % 2 ? 'kb' : 'web',
      })
    }
    return { items }
  }

  async transcribe(input: { fileName: string; bytes: Uint8Array; context?: AssistantContext }): Promise<TranscriptionResult> {
    // Deterministic mock: echo filename and produce two action items
    const base = input.fileName.replace(/\.[a-zA-Z0-9]+$/, '')
    return {
      transcript: `Transcript for ${base}. (mock)`,
      summary: 'Meeting covered goals, risks, next steps. (mock)',
      actionItems: [
        { id: deterministicId(base + ':1'), text: 'Draft project brief', owner: 'owner@acme.com' },
        { id: deterministicId(base + ':2'), text: 'Schedule stakeholder review', due: '2025-01-15' },
      ],
    }
  }

  async contextHelp(_input: ContextHelpRequest): Promise<ContextHelpItem[]> {
    return [
      {
        id: 'editor-help',
        title: 'Editor: Tips for structure',
        body: 'Use headings (##) and short paragraphs. Add tags to improve discovery.',
      },
      {
        id: 'assistant-help',
        title: 'Assistant: What can it do?',
        body: 'Ask the assistant to answer questions, suggest edits, and fact-check claims against your knowledge.',
      },
    ]
  }
}
