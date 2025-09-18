import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireWorkspaceAccess, HttpError } from '@/app/api/recommendations/_auth'
import { getRecommendationService } from '@/server/modules/recommendations/registry'

const eventSchema = z.object({
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

    const auth = await requireAuth(request)
    await requireWorkspaceAccess(auth, payload.workspaceId)

    const service = getRecommendationService()
    const persisted = await service.recordEvent({
      ...payload,
      userId: auth.userId,
      timestamp: payload.timestamp ?? Date.now(),
    })

    return NextResponse.json({ event: persisted }, { status: 201 })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid event payload', details: error.errors }, { status: 400 })
    }
    console.error('Recorder error', error)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
}
