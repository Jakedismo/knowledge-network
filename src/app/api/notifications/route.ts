import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/modules/organization/api-guard'
import { notificationService, NotificationTypeSchema } from '@/server/modules/notifications/notification.service'
import { rateLimiter } from '@/server/utils/rate-limit'

const CreateBody = z.object({
  userId: z.string(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: NotificationTypeSchema.optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
})

const Query = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const url = new URL(req.url)
    const parsed = Query.parse(Object.fromEntries(url.searchParams))
    const items = await notificationService.list({
      userId: ctx.userId,
      unreadOnly: parsed.unreadOnly ?? false,
      limit: parsed.limit ?? 30,
    })
    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Allow system/admin to post; use guard for now (same user can send to self)
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || req.headers.get('x-real-ip') || '0.0.0.0'
    const r = await rateLimiter.allow(`notif:${ctx.userId}:${ip}`, 60, 60_000)
    if (!r.allowed) return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: r.headers })
    const body = CreateBody.parse(await req.json())
    // If not posting to self, require same workspace context (simple guard)
    if (body.userId !== ctx.userId && !ctx.workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const create: any = { userId: body.userId, title: body.title, message: body.message }
    if (body.type !== undefined) create.type = body.type
    if (body.actionUrl !== undefined) create.actionUrl = body.actionUrl
    if (body.metadata !== undefined) create.metadata = body.metadata
    const row = await notificationService.create(create)
    return new NextResponse(JSON.stringify({ notification: row }), { status: 201, headers: r.headers })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
