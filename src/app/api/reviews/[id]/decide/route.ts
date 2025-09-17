import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { getWorkflowService } from '@/server/modules/workflows'
import type { DecisionInput } from '@/server/modules/workflows/types'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAccess(req, OrgPermission.REVIEW_DECIDE, OrgResourceType.KNOWLEDGE)
  if (ctx instanceof NextResponse) return ctx
  const body = (await req.json()) as DecisionInput
  if (!body?.decision) return NextResponse.json({ error: 'decision required' }, { status: 400 })
  const result = await getWorkflowService().recordDecision(params.id, ctx.userId, body)
  return NextResponse.json({ data: result })
}
