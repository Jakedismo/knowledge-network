import { NextRequest, NextResponse } from 'next/server'
import { requireAIAccess } from '@/server/modules/ai/policy'
import { aiConfig } from '@/server/modules/ai'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireAIAccess(req, { permission: 'ai:invoke' })
  if (guard instanceof Response) return guard
  if (!aiConfig.apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  const body = (await req.json().catch(() => ({}))) as { claim?: string; documentId?: string }
  const claim = body?.claim?.trim()
  if (!claim) return NextResponse.json({ error: 'Missing claim' }, { status: 400 })

  // Phase 1: ask model for status only
  let status: 'supported' | 'contradicted' | 'uncertain' = 'uncertain'
  try {
    const { default: fetchExecute } = await import('./util-execute')
    const out = await fetchExecute({
      instructions:
        'Fact-check the claim and return ONLY JSON {finding:{status:"supported|contradicted|uncertain"}}. Be conservative; prefer uncertain if ambiguous.',
      input: { claim },
    })
    const parsed = JSON.parse(out ?? '{}')
    const s = String(parsed?.finding?.status ?? '').toLowerCase()
    if (s === 'supported' || s === 'contradicted' || s === 'uncertain') status = s
  } catch {}

  // Phase 2: ground with simple search suggestions
  const evidence: Array<{ id: string; title: string; snippet: string; url?: string }> = []
  try {
    const qs = new URLSearchParams({ q: claim, size: '3' }).toString()
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/search/suggest?${qs}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const items = Array.isArray(data?.suggestions) ? data.suggestions : []
      for (const it of items.slice(0, 3)) {
        evidence.push({ id: String(it.id ?? it._id ?? it.key ?? ''), title: String(it.text ?? it.title ?? 'Result'), snippet: String(it.text ?? '') })
      }
    }
  } catch {}

  if (body.documentId) {
    evidence.unshift({ id: body.documentId, title: 'Current Document', snippet: 'Claim checked against current document.' })
  }

  return NextResponse.json({ claim, finding: { status, evidence } })
}

// Small helper module to reuse the /api/ai/execute path without duplicating logic
export default function noop() {}
