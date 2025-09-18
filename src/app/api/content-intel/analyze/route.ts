import { NextResponse } from 'next/server'
import { contentIntelligenceService } from '@/server/modules/content-intel/analyze.service'
import type { AnalyzeRequest } from '@/server/modules/content-intel/types'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeRequest
    if (!body?.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    }
    const result = await contentIntelligenceService.analyze(body)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status: 400 })
  }
}

