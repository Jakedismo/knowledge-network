import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRecommendationService } from '@/server/modules/recommendations/registry'
import { authenticateRequest } from '@/app/api/recommendations/_auth'

const querySchema = z.object({
  workspace: z.string().min(1),
  demo: z.coerce.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const params = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const authUser = await authenticateRequest(request, params.demo ? 'demo-user' : undefined)
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const service = getRecommendationService()
    const profiles = await service.experts(params.workspace)
    return NextResponse.json({ experts: profiles })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 })
    }
    console.error('Experts endpoint error', error)
    return NextResponse.json({ error: 'Failed to compute experts' }, { status: 500 })
  }
}

