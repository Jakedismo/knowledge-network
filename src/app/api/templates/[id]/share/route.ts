import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgResourceType } from '@/server/modules/organization/models'
import { templateService } from '@/server/modules/templates/template.service'
import '@/server/startup'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, 'template:share', OrgResourceType.KNOWLEDGE, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as { workspaceId: string; grants: Array<{ kind: 'USER' | 'ROLE'; subjectId: string; permissions: string[] }> }
  if (!body?.workspaceId || !Array.isArray(body?.grants)) return NextResponse.json({ error: 'workspaceId, grants required' }, { status: 400 })
  await templateService.share({ templateId: params.id, ...body })
  return new NextResponse(null, { status: 204 })
}

