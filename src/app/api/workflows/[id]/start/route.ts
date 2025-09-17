import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { getWorkflowService } from '@/server/modules/workflows'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAccess(req, OrgPermission.REVIEW_START, OrgResourceType.KNOWLEDGE)
  if (ctx instanceof NextResponse) return ctx
  if (!ctx.workspaceId) return NextResponse.json({ error: 'Workspace context required' }, { status: 400 })
  const body = (await req.json()) as { knowledgeId: string }
  if (!body?.knowledgeId) return NextResponse.json({ error: 'knowledgeId required' }, { status: 400 })
  const data = await getWorkflowService().startReview({
    workspaceId: ctx.workspaceId,
    knowledgeId: body.knowledgeId,
    workflowId: params.id,
    initiatorId: ctx.userId,
  })
  return NextResponse.json({ data }, { status: 201 })
}
