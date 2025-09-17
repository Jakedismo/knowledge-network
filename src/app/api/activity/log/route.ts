import { NextResponse } from 'next/server'
import { z } from 'zod'
import { activityService, ActivityActionSchema } from '@/server/modules/activity/activity.service'
import { requireAuth } from '@/server/modules/organization/api-guard'
import { rateLimiter } from '@/server/utils/rate-limit'

const Body = z.object({
  action: ActivityActionSchema,
  resourceType: z.enum(['WORKSPACE', 'COLLECTION', 'KNOWLEDGE']),
  resourceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(req: Request) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || req.headers.get('x-real-ip') || '0.0.0.0'
    const r = await rateLimiter.allow(`act:${ctx.userId}:${ip}`, 90, 60_000)
    if (!r.allowed) return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: r.headers })
    const input = Body.parse(await req.json())
    const ipAddr = typeof ip === 'string' ? ip : null
    const ua = req.headers.get('user-agent') || null
    const payload: any = {
      action: input.action,
      resourceType: input.resourceType,
      metadata: input.metadata,
      ipAddress: ipAddr,
      userAgent: ua,
      userId: ctx.userId,
      workspaceId: ctx.workspaceId ?? null,
    }
    if (input.resourceId !== undefined) payload.resourceId = input.resourceId ?? null
    const row = await activityService.log(payload)
    return new NextResponse(JSON.stringify({ ok: true, activity: row }), { headers: r.headers })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}
