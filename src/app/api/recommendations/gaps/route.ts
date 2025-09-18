import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRecommendationService } from '@/server/modules/recommendations/registry'
import { authenticateRequest } from '@/app/api/recommendations/_auth'

const querySchema = z.object({
  user: z.string().min(1),
  workspace: z.string().min(1),
  demo: z.coerce.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const params = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const authUser = await authenticateRequest(request, params.demo ? params.user : undefined)
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (authUser !== params.user) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 })
    }

    const service = getRecommendationService()
    const result = await service.knowledgeGaps(params.user, params.workspace)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 })
    }
    console.error('Knowledge gaps error', error)
    return NextResponse.json({ error: 'Failed to compute gaps' }, { status: 500 })
  }
}

