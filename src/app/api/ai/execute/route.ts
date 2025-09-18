import { NextResponse } from 'next/server'
import { executeAgent } from '@/server/modules/ai/execute'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { instructions?: string; input?: Record<string, unknown> }
    const res = await executeAgent({ instructions: body.instructions ?? '', input: body.input ?? {} })
    return NextResponse.json(res)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Agent execution failed' }, { status: 400 })
  }
}

