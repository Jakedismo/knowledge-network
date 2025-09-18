import { NextResponse } from 'next/server'
import { suggestTags } from '@/server/modules/content-intel/keywords'
import { detectLanguage } from '@/server/modules/content-intel/tokenize'
function requireBasicAuth(req: Request): Response | null {
  const userId = req.headers.get('x-user-id')
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  return null
}

export async function POST(req: Request) {
  try {
    const unauth = requireBasicAuth(req)
    if (unauth) return unauth
    const body = (await req.json()) as { content?: string; max?: number; existing?: string[]; title?: string; languageHint?: any }
    if (!body?.content || typeof body.content !== 'string') return NextResponse.json({ error: 'content required' }, { status: 400 })
    const { language } = detectLanguage(body.content, body.languageHint)
    const tags = suggestTags(body.content, { language, max: body.max ?? 10, existing: body.existing ?? [], title: body.title ?? '' })
    return NextResponse.json({ tags })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status: 400 })
  }
}
