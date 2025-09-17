import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { resolveOrgService } from '@/lib/org/adapter'
import { buildParentChain, requirePermission } from '@/lib/org/permissions'

const listQuery = z.object({ workspaceId: z.string().min(1) })
const createBody = z.object({ workspaceId: z.string().min(1), name: z.string().min(1), parentId: z.string().optional(), description: z.string().optional() })

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

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    const { searchParams } = new URL(req.url)
    const q = listQuery.parse({ workspaceId: searchParams.get('workspaceId') })
    // Permission: read collection tree in workspace
    await requirePermission({ userId, workspaceId: q.workspaceId, resource: 'collection', action: 'read', parentAclChain: [] })
    const orgService = await resolveOrgService()
    const data = await orgService.getCollectionsTree(q.workspaceId, userId)
    return NextResponse.json({ data })
  } catch (e: any) {
    const status = e?.status ?? (e?.message === 'Unauthorized' ? 401 : 400)
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    const parsed = createBody.parse(await req.json())
    await requirePermission({ userId, workspaceId: parsed.workspaceId, resource: 'collection', action: 'create', parentAclChain: [] })
    const orgService = await resolveOrgService()
    const base = { userId, workspaceId: parsed.workspaceId, name: parsed.name, parentId: (parsed.parentId ?? null) as string | null }
    const node = await orgService.createCollection(
      parsed.description ? { ...base, description: parsed.description } : base,
    )
    return NextResponse.json({ data: node }, { status: 201 })
  } catch (e: any) {
    const status = e?.status ?? (e?.message === 'Unauthorized' ? 401 : 400)
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}
