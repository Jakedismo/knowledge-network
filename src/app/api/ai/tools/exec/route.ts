import { NextRequest, NextResponse } from 'next/server'
import { requireAIAccess } from '@/server/modules/ai/policy'
import { buildWorkspaceAgentTools } from '@/server/modules/ai/tools'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireAIAccess(req, { permission: 'ai:invoke' })
  if (guard instanceof Response) return guard
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const name = String(body?.name || '')
  const args = (body?.args ?? {}) as Record<string, unknown>
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  try {
    const tool = buildWorkspaceAgentTools().find((t) => t.name === name)
    if (!tool) return NextResponse.json({ error: 'Unknown tool' }, { status: 404 })
    const out = await tool.execute(args, { userId: guard.userId, workspaceId: guard.workspaceId })
    return NextResponse.json({ ok: true, name, result: out })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Tool execution failed' }, { status: err?.status || 400 })
  }
}

