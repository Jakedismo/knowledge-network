import { NextRequest, NextResponse } from 'next/server'
import { requireAIAccess } from '@/server/modules/ai/policy'
import { aiConfig } from '@/server/modules/ai'
import { runAssistantCapability, type FactCheckExecutionRequest } from '@/server/modules/assistant/runtime'
import type { AssistantContext } from '@/lib/assistant/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireAIAccess(req, { permission: 'ai:invoke' })
  if (guard instanceof Response) return guard
  if (!aiConfig.apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  const body = (await req.json().catch(() => ({}))) as { claim?: string; documentId?: string }
  const claim = body?.claim?.trim()
  if (!claim) return NextResponse.json({ error: 'Missing claim' }, { status: 400 })

  const request: FactCheckExecutionRequest = {
    capability: 'fact-check',
    userId: guard.userId,
    input: {
      claim,
      context: sanitizeContext(body?.context),
      ...(body.documentId ? { documentId: String(body.documentId) } : {}),
    },
  }
  if (guard.workspaceId) request.workspaceId = guard.workspaceId
  const agentResult = await runAssistantCapability(request)
  if (agentResult.type !== 'fact-check') throw new Error('Unexpected assistant response')
  const result = agentResult.data

  // Phase 2: augment evidence with simple search suggestions
  const evidence = Array.isArray(result.finding.evidence) ? [...result.finding.evidence] : []
  try {
    const qs = new URLSearchParams({ q: claim, size: '3' }).toString()
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/search/suggest?${qs}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const items = Array.isArray(data?.suggestions) ? data.suggestions : []
      for (const it of items.slice(0, 3)) {
        evidence.push({
          id: String(it.id ?? it._id ?? it.key ?? ''),
          title: String(it.text ?? it.title ?? 'Result'),
          snippet: String(it.text ?? ''),
        })
      }
    }
  } catch {}

  if (body.documentId) {
    evidence.unshift({ id: body.documentId, title: 'Current Document', snippet: 'Claim checked against current document.' })
  }

  return NextResponse.json({ claim: result.claim, finding: { status: result.finding.status, evidence } })
}

// Small helper module placeholder retained for backwards compatibility
export default function noop() {}

function sanitizeContext(input: unknown): AssistantContext {
  const ctx: AssistantContext = {}
  if (!input || typeof input !== 'object') return ctx
  const candidate = input as Record<string, unknown>
  if (typeof candidate.documentId === 'string' && candidate.documentId.trim()) ctx.documentId = candidate.documentId
  if (typeof candidate.selectionText === 'string' && candidate.selectionText.trim()) ctx.selectionText = candidate.selectionText
  if (typeof candidate.route === 'string' && candidate.route.trim()) ctx.route = candidate.route
  if (Array.isArray(candidate.tags)) {
    const tags = candidate.tags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    if (tags.length) ctx.tags = tags
  }
  return ctx
}
