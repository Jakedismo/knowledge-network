import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { resolveOrgService } from '@/lib/org/adapter'

const createBody = z.object({ name: z.string().min(1), description: z.string().optional() })

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
    const orgService = await resolveOrgService()
    const data = await orgService.listWorkspaces(userId)
    return NextResponse.json({ data })
  } catch (e: any) {
    const status = e?.message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    const body = createBody.parse(await req.json())
    const orgService = await resolveOrgService()
    const ws = await orgService.createWorkspace(userId, body.name, body.description)
    return NextResponse.json({ data: ws }, { status: 201 })
  } catch (e: any) {
    const status = e?.message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}
