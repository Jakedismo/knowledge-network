import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { commentStore } from '@/server/modules/comments/store'
import { requireAuth } from '@/server/modules/organization/api-guard'

const paramSchema = z.object({ id: z.string().min(1) })
const createBody = z.object({ content: z.string().min(1) })

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = paramSchema.parse(params)
    const replies = commentStore.listReplies(id)
    return NextResponse.json({ data: replies })
  } catch (e: any) {
    const status = e?.status ?? 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { id } = paramSchema.parse(params)
    const parent = commentStore.get(id)
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    const body = createBody.parse(await req.json())
    const reply = commentStore.create({
      knowledgeId: parent.knowledgeId,
      parentId: parent.id,
      authorId: auth.userId,
      content: body.content,
      mentions: [],
      positionData: null,
    })
    return NextResponse.json({ data: reply }, { status: 201 })
  } catch (e: any) {
    const status = e?.status ?? 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

