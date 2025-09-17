import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgResourceType } from '@/server/modules/organization/models'
import { templateService } from '@/server/modules/templates/template.service'
import '@/server/startup'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const branch = url.searchParams.get('branch') ?? undefined
  const data = await templateService.listVersions(params.id, branch || undefined)
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, 'template:update', OrgResourceType.KNOWLEDGE, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as { authorId: string; content: string; changeSummary?: string; branchName?: string }
  if (!body?.authorId || !body?.content) return NextResponse.json({ error: 'authorId, content required' }, { status: 400 })
  await templateService.commitVersion({ templateId: params.id, ...body })
  return new NextResponse(null, { status: 201 })
}

