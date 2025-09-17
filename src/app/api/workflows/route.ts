import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { getWorkflowService } from '@/server/modules/workflows'
import type { CreateWorkflowInput } from '@/server/modules/workflows/types'

export async function GET(req: Request) {
  const ctx = await requireAccess(req, OrgPermission.WORKFLOW_MANAGE, OrgResourceType.WORKSPACE)
  if (ctx instanceof NextResponse) return ctx
  if (!ctx.workspaceId) return NextResponse.json({ error: 'Workspace context required' }, { status: 400 })
  const data = await getWorkflowService().listWorkflows(ctx.workspaceId)
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const ctx = await requireAccess(req, OrgPermission.WORKFLOW_MANAGE, OrgResourceType.WORKSPACE)
  if (ctx instanceof NextResponse) return ctx
  if (!ctx.workspaceId) return NextResponse.json({ error: 'Workspace context required' }, { status: 400 })
  const body = (await req.json()) as Omit<CreateWorkflowInput, 'workspaceId'>
  const wf = await getWorkflowService().createWorkflow({ ...body, workspaceId: ctx.workspaceId })
  return NextResponse.json({ data: wf }, { status: 201 })
}
