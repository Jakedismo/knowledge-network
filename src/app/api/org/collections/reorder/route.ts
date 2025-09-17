import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { resolveOrgService } from '@/lib/org/adapter'
import { requirePermission } from '@/lib/org/permissions'

const bodySchema = z.object({ workspaceId: z.string().min(1), id: z.string().min(1), newSortOrder: z.number().int() })

function getAuth(req: NextRequest): { userId: string } {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) throw new Error('Unauthorized')
  const payload = jwt.verify(token, process.env.JWT_SECRET as string, {
    issuer: 'knowledge-network',
    audience: 'knowledge-network-api',
    algorithms: ['HS256'],
  }) as { sub: string }
  return { userId: payload.sub }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    const body = bodySchema.parse(await req.json())
    await requirePermission({ userId, workspaceId: body.workspaceId, resource: 'collection', action: 'update', resourceId: body.id, parentAclChain: [] })
    const orgService = await resolveOrgService()
    await orgService.reorderCollection({ workspaceId: body.workspaceId, userId, id: body.id, newSortOrder: body.newSortOrder })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e?.status ?? (e?.message === 'Unauthorized' ? 401 : 400)
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}
