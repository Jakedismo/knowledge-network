import { NextResponse } from 'next/server'
import { z } from 'zod'
import { activityService, ActivityActionSchema } from '@/server/modules/activity/activity.service'
import { requireAuth } from '@/server/modules/organization/api-guard'

const Query = z.object({
  actions: z.string().optional(), // CSV of actions
  resourceTypes: z.string().optional(), // CSV
  resourceIds: z.string().optional(), // CSV
  authoredBy: z.string().optional(), // CSV
  limit: z.coerce.number().min(1).max(100).optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const url = new URL(req.url)
    const parsed = Query.parse(Object.fromEntries(url.searchParams))
    const parseCsv = (v?: string | null) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : undefined)
    const actions = parseCsv(parsed.actions) as z.infer<typeof ActivityActionSchema>[] | undefined
    const resourceTypes = parseCsv(parsed.resourceTypes) as ('WORKSPACE' | 'COLLECTION' | 'KNOWLEDGE')[] | undefined
    const resourceIds = parseCsv(parsed.resourceIds)
    const authoredBy = parseCsv(parsed.authoredBy)

    const filters: any = {}
    if (actions !== undefined) filters.actions = actions
    if (resourceTypes !== undefined) filters.resourceTypes = resourceTypes
    if (resourceIds !== undefined) filters.resourceIds = resourceIds
    if (authoredBy !== undefined) filters.authoredBy = authoredBy

    const feed = await activityService.feed({
      userId: ctx.userId,
      ...(ctx.workspaceId ? { workspaceId: ctx.workspaceId } : {}),
      limit: parsed.limit ?? 30,
      ...(Object.keys(filters).length ? { filters } : {}),
    })
    return NextResponse.json({ items: feed })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to load activity feed' }, { status: 500 })
  }
}
