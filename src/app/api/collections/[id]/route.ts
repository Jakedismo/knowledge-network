import { NextResponse } from 'next/server'
import { collectionService } from '@/server/modules/organization/collection.service'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, OrgPermission.COLLECTION_MANAGE, OrgResourceType.COLLECTION, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as { name?: string; description?: string | null; color?: string | null; icon?: string | null }
  const updated = await collectionService.update({ id: params.id, ...body })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // Require manage on collection
  // eslint-disable-next-line require-await
  const req = {} as Request
  void req
  await collectionService.remove(params.id)
  return NextResponse.json({ ok: true })
}
