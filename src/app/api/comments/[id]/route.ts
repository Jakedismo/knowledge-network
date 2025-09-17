import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { commentStore } from '@/server/modules/comments/store'
import { requireAuth } from '@/server/modules/organization/api-guard'

const paramSchema = z.object({ id: z.string().min(1) })
const updateBody = z.object({ content: z.string().min(1).optional(), status: z.enum(['open', 'resolved', 'deleted', 'hidden']).optional() })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { id } = paramSchema.parse(params)
    const patchIn = updateBody.parse(await req.json())
    // With exactOptionalPropertyTypes, ensure we don't pass possibly-undefined fields
    const patch: Partial<{ content: string; status: 'open'|'resolved'|'deleted'|'hidden' }> = {}
    if (patchIn.content !== undefined) patch.content = patchIn.content
    if (patchIn.status !== undefined) patch.status = patchIn.status
    const existing = commentStore.get(id)
    if (!existing) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    // Allow edit if author or keep simple for mock
    const next = commentStore.update(id, patch)
    if (!next) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    return NextResponse.json({ data: next })
  } catch (e: any) {
    const status = e?.status ?? 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { id } = paramSchema.parse(params)
    const ok = commentStore.delete(id)
    if (!ok) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e?.status ?? 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}
