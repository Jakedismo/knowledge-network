import { NextResponse } from 'next/server'
import { collectionService } from '@/server/modules/organization/collection.service'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'

export async function POST(req: Request) {
  const access = await requireAccess(req, OrgPermission.COLLECTION_CREATE, OrgResourceType.WORKSPACE)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as {
    name: string
    workspaceId: string
    parentId?: string | null
    description?: string | null
    color?: string | null
    icon?: string | null
    type?: 'FOLDER' | 'SMART'
  }
  if (!body?.name || !body?.workspaceId) return NextResponse.json({ error: 'name and workspaceId required' }, { status: 400 })
  const created = await collectionService.create(body)
  return NextResponse.json(created, { status: 201 })
}
