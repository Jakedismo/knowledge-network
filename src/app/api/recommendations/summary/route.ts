import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRecommendationService } from '@/server/modules/recommendations/registry'
import { requireAuth, requireWorkspaceAccess, HttpError } from '@/app/api/recommendations/_auth'

const querySchema = z.object({
  workspace: z.string().min(1),
  limit: z.coerce.number().min(1).max(50).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const params = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const auth = await requireAuth(request)
    await requireWorkspaceAccess(auth, params.workspace)

    const service = getRecommendationService()
    const summary = await service.summary({
      userId: auth.userId,
      workspaceId: params.workspace,
      options: { maxResults: params.limit ?? 20 },
    })

    return NextResponse.json(summary)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 })
    }
    console.error('Recommendations summary error', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}

