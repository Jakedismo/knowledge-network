import { NextResponse } from 'next/server'
import { tagService } from '@/server/modules/organization/tag.service'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  const items = await tagService.list(workspaceId)
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const access = await requireAccess(req, OrgPermission.TAG_CREATE, OrgResourceType.WORKSPACE)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as { workspaceId: string; name: string; color?: string }
  if (!body?.workspaceId || !body?.name) return NextResponse.json({ error: 'workspaceId and name required' }, { status: 400 })
  const tag = await tagService.create(body.workspaceId, body.name, body.color)
  return NextResponse.json(tag, { status: 201 })
}
