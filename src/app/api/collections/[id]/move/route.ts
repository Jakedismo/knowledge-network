import { NextResponse } from 'next/server'
import { collectionService } from '@/server/modules/organization/collection.service'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, OrgPermission.COLLECTION_MANAGE, OrgResourceType.COLLECTION, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as { parentId: string | null; workspaceId: string }
  if (!('parentId' in body) || !body.workspaceId) return NextResponse.json({ error: 'parentId and workspaceId required' }, { status: 400 })
  const updated = await collectionService.move({ id: params.id, parentId: body.parentId, workspaceId: body.workspaceId })
  return NextResponse.json(updated)
}
