import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRecommendationService } from '@/server/modules/recommendations/registry'
import { requireAuth, requireWorkspaceAccess, HttpError } from '@/app/api/recommendations/_auth'

const querySchema = z.object({
  workspace: z.string().min(1),
  knowledgeId: z.string().min(1),
  limit: z.coerce.number().min(1).max(25).optional(),
  demo: z.coerce.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const params = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const auth = await requireAuth(request)
    await requireWorkspaceAccess(auth, params.workspace)

    const service = getRecommendationService()
    const items = await service.related(params.workspace, params.knowledgeId, params.limit ?? 10)
    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 })
    }
    console.error('Related content error', error)
    return NextResponse.json({ error: 'Failed to compute related content' }, { status: 500 })
  }
}
