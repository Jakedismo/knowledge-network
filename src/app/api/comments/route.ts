import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { commentStore } from '@/server/modules/comments/store'
import type { CommentMention, CommentPositionData } from '@/types/comments'
import { requireAuth } from '@/server/modules/organization/api-guard'

const listQuery = z.object({ knowledgeId: z.string().min(1) })

const createBody = z.object({
  knowledgeId: z.string().min(1),
  parentId: z.string().nullable().optional(),
  content: z.string().min(1),
  mentions: z
    .array(
      z.object({
        userId: z.string().min(1),
        displayName: z.string().min(1),
        start: z.number().int().min(0),
        length: z.number().int().min(1),
      }),
    )
    .optional()
    .default([]),
  positionData: z
    .object({
      blockId: z.string().optional(),
      headingId: z.string().optional(),
      headingText: z.string().optional(),
    })
    .nullable()
    .optional(),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { searchParams } = new URL(req.url)
    const q = listQuery.parse({ knowledgeId: searchParams.get('knowledgeId') })
    const data = commentStore.listByKnowledge(q.knowledgeId)
    return NextResponse.json({ data })
  } catch (e: any) {
    const status = e?.status ?? 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const body = createBody.parse(await req.json())
    const model = commentStore.create({
      knowledgeId: body.knowledgeId,
      parentId: body.parentId ?? null,
      authorId: auth.userId,
      content: body.content,
      mentions: (body.mentions ?? []) as CommentMention[],
      positionData: (body.positionData ?? null) as CommentPositionData | null,
    })
    return NextResponse.json({ data: model }, { status: 201 })
  } catch (e: any) {
    const status = e?.status ?? 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

