import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgResourceType } from '@/server/modules/organization/models'
import { templateService } from '@/server/modules/templates/template.service'
import '@/server/startup'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Permission to use a template => template:use on the template entity
  const access = await requireAccess(req, 'template:use', OrgResourceType.KNOWLEDGE, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as {
    target: { workspaceId: string; authorId: string; collectionId?: string | null; title?: string }
    values?: Record<string, string | number | boolean | null>
  }
  if (!body?.target?.workspaceId || !body?.target?.authorId) {
    return NextResponse.json({ error: 'target.workspaceId and target.authorId required' }, { status: 400 })
  }
  const created = await templateService.apply({ templateId: params.id, ...body })
  return NextResponse.json(created, { status: 201 })
}

