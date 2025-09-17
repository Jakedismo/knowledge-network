import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgResourceType } from '@/server/modules/organization/models'
import { templateService } from '@/server/modules/templates/template.service'
import '@/server/startup'

export async function GET(req: Request) {
  const access = await requireAccess(req, 'template:read', OrgResourceType.WORKSPACE)
  if (access instanceof NextResponse) return access
  const url = new URL(req.url)
  const workspaceId = access.workspaceId || url.searchParams.get('workspaceId') || ''
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  const includeMarketplace = url.searchParams.get('marketplace') === '1'
  const data = await templateService.list(workspaceId, { includeMarketplace })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const access = await requireAccess(req, 'template:create', OrgResourceType.WORKSPACE)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as {
    workspaceId: string
    authorId: string
    title: string
    content: string
    collectionId?: string | null
    metadata?: Record<string, unknown>
  }
  if (!body?.workspaceId || !body?.authorId || !body?.title || !body?.content) {
    return NextResponse.json({ error: 'workspaceId, authorId, title, content required' }, { status: 400 })
  }
  const created = await templateService.create(body)
  return NextResponse.json(created, { status: 201 })
}

