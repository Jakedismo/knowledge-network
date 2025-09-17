import { NextResponse } from 'next/server'
import { tagService } from '@/server/modules/organization/tag.service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  const params: { workspaceId: string; query?: string; contentText?: string; limit?: number } = { workspaceId }
  const q = searchParams.get('q'); if (q !== null) params.query = q
  const content = searchParams.get('content'); if (content !== null) params.contentText = content
  const limitStr = searchParams.get('limit')
  if (limitStr !== null) {
    const n = Number(limitStr)
    if (Number.isFinite(n)) params.limit = n
  }
  const tags = await tagService.suggest(params)
  return NextResponse.json({ items: tags })
}
