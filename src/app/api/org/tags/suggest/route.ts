import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { resolveOrgService } from '@/lib/org/adapter'

const querySchema = z.object({ workspaceId: z.string().min(1), q: z.string().default('') })

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
    const q = querySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      q: searchParams.get('q') ?? '',
    })
    const orgService = await resolveOrgService()
    const data = await orgService.suggestTags(q.workspaceId, userId, q.q)
    return NextResponse.json({ data })
  } catch (e: any) {
    const status = e?.message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}
