import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { getWorkflowService } from '@/server/modules/workflows'
import type { ChangeRequestInput } from '@/server/modules/workflows/types'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAccess(req, OrgPermission.REVIEW_DECIDE, OrgResourceType.KNOWLEDGE)
  if (ctx instanceof NextResponse) return ctx
  const body = (await req.json()) as ChangeRequestInput
  if (!body?.versionFromId || !body?.versionToId) {
    return NextResponse.json({ error: 'versionFromId and versionToId required' }, { status: 400 })
  }
  await getWorkflowService().requestChanges(params.id, body)
  return NextResponse.json({ ok: true })
}
