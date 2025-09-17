import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/modules/organization/api-guard'
import { notificationService } from '@/server/modules/notifications/notification.service'

export async function GET(req: Request) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  const prefs = await notificationService.preferences(ctx.userId)
  return NextResponse.json({ preferences: prefs })
}

const Body = z.object({ notifications: z.record(z.any()).optional() }).strict()

export async function PUT(req: Request) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const body = Body.parse(await req.json())
    const next = await notificationService.updatePreferences(ctx.userId, body)
    return NextResponse.json({ preferences: next })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}

