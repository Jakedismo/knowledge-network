import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgResourceType } from '@/server/modules/organization/models'
import { templateService } from '@/server/modules/templates/template.service'
import '@/server/startup'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, 'template:publish', OrgResourceType.KNOWLEDGE, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as {
    workspaceId: string
    creatorId: string
    visibility: 'PUBLIC' | 'UNLISTED' | 'WORKSPACE'
    title: string
    description?: string
    categories?: string[]
    tags?: string[]
  }
  if (!body?.workspaceId || !body?.creatorId || !body?.visibility || !body?.title) {
    return NextResponse.json({ error: 'workspaceId, creatorId, visibility, title required' }, { status: 400 })
  }
  const listing = await templateService.publish({ templateId: params.id, ...body })
  return NextResponse.json(listing, { status: 201 })
}

