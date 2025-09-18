import { NextResponse } from 'next/server'
import { aiConfig } from '@/server/modules/ai'

export const runtime = 'nodejs'

export async function GET() {
  const configured = Boolean(aiConfig.apiKey)
  const engine = (process.env.AI_ENGINE ?? 'agents').toLowerCase()
  let engineReady = true
  if (engine === 'agents') {
    try {
      await import('@openai/agents')
      engineReady = true
    } catch {
      engineReady = false
    }
  }
  return NextResponse.json({ ok: true, configured, model: aiConfig.defaultModel, engine, engineReady })
}
