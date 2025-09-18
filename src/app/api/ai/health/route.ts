import { NextResponse } from 'next/server'
import { aiConfig } from '@/server/modules/ai'

export const runtime = 'nodejs'

export async function GET() {
  const configured = Boolean(aiConfig.apiKey)
  return NextResponse.json({ ok: true, configured, model: aiConfig.defaultModel })
}

