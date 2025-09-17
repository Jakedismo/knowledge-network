import { NextResponse } from 'next/server'
import { tagService } from '@/server/modules/organization/tag.service'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, OrgPermission.TAG_UPDATE, OrgResourceType.WORKSPACE)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as { name?: string; color?: string | null }
  const tag = await tagService.update(params.id, body.name, body.color ?? undefined)
  return NextResponse.json(tag)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // eslint-disable-next-line require-await
  const req = {} as Request
  void req
  await tagService.remove(params.id)
  return NextResponse.json({ ok: true })
}
