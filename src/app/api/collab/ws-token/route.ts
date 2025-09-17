import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { mintWsToken } from '@/lib/collaboration/ws-token'

const bodySchema = z.object({ knowledgeId: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify access token for user context
    const payload = jwt.verify(token, process.env.JWT_SECRET as string, {
      issuer: 'knowledge-network',
      audience: 'knowledge-network-api',
      algorithms: ['HS256'],
    }) as { sub: string; sessionId: string; workspaceId?: string; roles?: string[] }

    const json = await req.json()
    const { knowledgeId } = bodySchema.parse(json)

    // Expose auth to ws-token helper via global (scoped to this request lifecycle)
    ;(globalThis as any).__collab_access_payload = payload

    const result = await mintWsToken({
      knowledgeId,
      requestId: req.headers.get('x-request-id') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
      ipHash: hashIp(req.headers.get('x-forwarded-for') ?? ''),
    })

    // Cleanup
    delete (globalThis as any).__collab_access_payload

    return NextResponse.json({ url: result.url, token: result.token, expiresAt: result.expiresAt, roomId: result.roomId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad Request' }, { status: 400 })
  }
}

function hashIp(ip: string): string | undefined {
  if (!ip) return undefined
  // Simple, deterministic hash (not cryptographically strong; adequate for correlation w/o PII)
  let h = 2166136261
  for (let i = 0; i < ip.length; i++) h = (h ^ ip.charCodeAt(i)) * 16777619
  return (h >>> 0).toString(16)
}
