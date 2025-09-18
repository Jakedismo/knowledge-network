import { NextResponse } from 'next/server'
import { summarize } from '@/server/modules/content-intel/summarize'
import { detectLanguage } from '@/server/modules/content-intel/tokenize'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { content?: string; maxSentences?: number; languageHint?: any }
    if (!body?.content || typeof body.content !== 'string') return NextResponse.json({ error: 'content required' }, { status: 400 })
    const { language } = detectLanguage(body.content, body.languageHint)
    const s = summarize(body.content, { maxSentences: body.maxSentences, language })
    return NextResponse.json({ summary: s.summary, ranked: s.ranked })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status: 400 })
  }
}

