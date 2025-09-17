import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/modules/organization/api-guard'
import { notificationService } from '@/server/modules/notifications/notification.service'

const Body = z.object({ isRead: z.boolean().default(true) })

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const body = Body.parse(await req.json())
    // Basic authorization: ensure the notification belongs to the user
    const row = await notificationService.markRead(ctx.userId, params.id, body.isRead)
    if (row.userId !== ctx.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ notification: row })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

