import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest } from '@/app/api/recommendations/_auth'
import { getRecommendationService } from '@/server/modules/recommendations/registry'

const eventSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  type: z.enum([
    'view',
    'like',
    'save',
    'comment',
    'share',
    'click',
    'followAuthor',
    'followTag',
    'search',
  ]),
  knowledgeId: z.string().optional(),
  authorId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  timestamp: z.coerce.number().nonnegative().optional(),
  weight: z.coerce.number().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = eventSchema.parse(body)

    const authUser = await authenticateRequest(request, payload.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (authUser !== payload.userId) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 })
    }

    const service = getRecommendationService()
    const persisted = await service.recordEvent({
      id: undefined,
      ...payload,
      timestamp: payload.timestamp ?? Date.now(),
    })

    return NextResponse.json({ event: persisted }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid event payload', details: error.errors }, { status: 400 })
    }
    console.error('Recorder error', error)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
}

