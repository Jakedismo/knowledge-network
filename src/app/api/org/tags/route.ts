import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { resolveOrgService } from '@/lib/org/adapter'

const bodySchema = z.object({ workspaceId: z.string().min(1), name: z.string().min(1), color: z.string().optional() })

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
    const parsed = bodySchema.parse(await req.json())
    const base = { workspaceId: parsed.workspaceId, userId, name: parsed.name }
    const orgService = await resolveOrgService()
    const tag = await orgService.upsertTag(parsed.color ? { ...base, color: parsed.color } : base)
    return NextResponse.json({ data: tag }, { status: 201 })
  } catch (e: any) {
    const status = e?.message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}
