import { NextResponse } from 'next/server'
import { detectLanguage } from '@/server/modules/content-intel/tokenize'
import { LocalTranslator } from '@/server/modules/content-intel/translate'
import type { LanguageCode } from '@/server/modules/content-intel/types'

const translator = new LocalTranslator()

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { content?: string; target?: LanguageCode; languageHint?: LanguageCode }
    if (!body?.content || typeof body.content !== 'string') return NextResponse.json({ error: 'content required' }, { status: 400 })
    if (!body?.target) return NextResponse.json({ error: 'target required' }, { status: 400 })
    const { language } = detectLanguage(body.content, body.languageHint)
    const t = await translator.translate(body.content, { source: language, target: body.target })
    return NextResponse.json({ translation: t })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status: 400 })
  }
}

