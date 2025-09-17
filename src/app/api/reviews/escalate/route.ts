import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { getWorkflowService } from '@/server/modules/workflows'

export async function POST(req: Request) {
  const ctx = await requireAccess(req, OrgPermission.WORKFLOW_MANAGE, OrgResourceType.WORKSPACE)
  if (ctx instanceof NextResponse) return ctx
  const count = await getWorkflowService().runEscalations()
  return NextResponse.json({ escalated: count })
}
