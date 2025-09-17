import { NextResponse } from 'next/server'
import { z } from 'zod'
import { activityService } from '@/server/modules/activity/activity.service'
import { requireAuth } from '@/server/modules/organization/api-guard'

const Query = z.object({
  period: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const url = new URL(req.url)
    const parsed = Query.parse(Object.fromEntries(url.searchParams))
    const since = parsed.since ? new Date(parsed.since) : undefined
    const until = parsed.until ? new Date(parsed.until) : undefined
    const args: any = { period: parsed.period }
    if (since) args.since = since
    if (until) args.until = until
    if (ctx.workspaceId) args.workspaceId = ctx.workspaceId
    const summary = await activityService.summarize(args)
    return NextResponse.json({ summary })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to summarize activity' }, { status: 500 })
  }
}
