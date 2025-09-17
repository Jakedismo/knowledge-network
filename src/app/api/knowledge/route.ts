import { NextResponse } from 'next/server'
import { requireAccess } from '@/server/modules/organization/api-guard'
import { OrgPermission, OrgResourceType } from '@/server/modules/organization/models'
import { knowledgeService } from '@/server/modules/organization/knowledge.service'
import '@/server/startup'

export async function POST(req: Request) {
  const access = await requireAccess(req, OrgPermission.DOCUMENT_CREATE, OrgResourceType.WORKSPACE)
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
  const created = await knowledgeService.create({
    workspaceId: body.workspaceId,
    authorId: body.authorId,
    title: body.title,
    content: body.content,
    ...(body.collectionId !== undefined ? { collectionId: body.collectionId } : {}),
    ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
  })
  return NextResponse.json(created, { status: 201 })
}
