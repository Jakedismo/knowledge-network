import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { getWorkflowService } from '@/server/modules/workflows'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAccess(req, OrgPermission.REVIEW_START, OrgResourceType.KNOWLEDGE)
  if (ctx instanceof NextResponse) return ctx
  const data = await getWorkflowService().reopen(params.id)
  return NextResponse.json({ data })
}

