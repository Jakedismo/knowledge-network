import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { resolveOrgService } from '@/lib/org/adapter'

const listQuery = z.object({ workspaceId: z.string().min(1) })
const createBody = z.object({
  workspaceId: z.string().min(1),
  knowledgeType: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  zodJson: z.record(z.any()),
})

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
    const orgService = await resolveOrgService()
    const data = await orgService.listMetadataSchemas(q.workspaceId, userId)
    return NextResponse.json({ data })
  } catch (e: any) {
    const status = e?.message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    const parsed = createBody.parse(await req.json())
    const base = {
      workspaceId: parsed.workspaceId,
      userId,
      knowledgeType: parsed.knowledgeType,
      version: parsed.version,
      title: parsed.title,
      zodJson: parsed.zodJson as Record<string, unknown>,
    }
    const orgService = await resolveOrgService()
    const schema = await orgService.registerMetadataSchema(
      parsed.description ? { ...base, description: parsed.description } : base,
    )
    return NextResponse.json({ data: schema }, { status: 201 })
  } catch (e: any) {
    const status = e?.message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}
