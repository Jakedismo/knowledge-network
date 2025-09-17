import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { knowledgeService } from '@/server/modules/organization/knowledge.service'
import '@/server/startup'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAccess(req, OrgPermission.DOCUMENT_UPDATE, OrgResourceType.KNOWLEDGE, params.id)
  if (access instanceof NextResponse) return access
  const body = (await req.json()) as {
    title?: string
    content?: string
    collectionId?: string | null
    metadata?: Record<string, unknown>
    status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  }
  const updated = await knowledgeService.update({ id: params.id, ...body })
  return NextResponse.json(updated)
}
