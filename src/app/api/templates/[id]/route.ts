import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgResourceType } from '@/server/modules/organization/models'
import { templateService } from '@/server/modules/templates/template.service'
import '@/server/startup'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await templateService.get(params.id)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, 'template:update', OrgResourceType.KNOWLEDGE, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as {
    title?: string
    content?: string
    metadata?: Record<string, unknown>
    collectionId?: string | null
    changeSummary?: string
    branchName?: string
    authorId: string
  }
  if (!body?.authorId) return NextResponse.json({ error: 'authorId required' }, { status: 400 })
  const updated = await templateService.update({ id: params.id, ...body })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, 'template:delete', OrgResourceType.KNOWLEDGE, params.id)
  if (access instanceof NextResponse) return access
  if (!access.workspaceId) return NextResponse.json({ error: 'workspaceId context required' }, { status: 400 })
  await templateService.remove(params.id, { workspaceId: access.workspaceId, userId: access.userId })
  return new NextResponse(null, { status: 204 })
}

