import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { aiConfig } from '@/server/modules/ai'
import { requireAIAccess } from '@/server/modules/ai/policy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireAIAccess(req, { permission: 'ai:invoke' })
  if (guard instanceof Response) return guard
  if (!aiConfig.apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  let openai: any
  try {
    const mod = await import('openai')
    openai = new (mod as any).OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseUrl,
      organization: aiConfig.organizationId,
      timeout: aiConfig.requestTimeoutMs,
    })
  } catch (err) {
    return NextResponse.json({ error: 'OpenAI SDK not installed' }, { status: 500 })
  }

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  const file = form.get('file') as unknown as File | null
  if (!file) return NextResponse.json({ error: 'Missing file field' }, { status: 400 })

  // Basic size guard (≤ 50 MB)
  const size = (file as any).size as number | undefined
  if (typeof size === 'number' && size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  // Try audio transcription API; prefer gpt-realtime in dev, fall back gracefully
  let transcriptText = ''
  try {
    const arrayBuf = await file.arrayBuffer()
    const blob = new Blob([arrayBuf], { type: (file as any).type || 'application/octet-stream' })
    // Try preferred realtime model name first, then official transcribe models
    const preferred = process.env.AUDIO_MODEL ?? 'gpt-realtime'
    const tryModels = [preferred, 'gpt-4o-transcribe', 'whisper-1']
    let ok = false
    for (const m of tryModels) {
      try {
        const result = await openai.audio.transcriptions.create({ file: blob as any, model: m as any })
        transcriptText = (result?.text as string) || ''
        ok = true
        break
      } catch (err) {
        // Try next
      }
    }
    if (!ok) return NextResponse.json({ error: 'Transcription API unavailable' }, { status: 501 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Transcription failed', details: serializeError(err) }, { status: 500 })
  }

  // Summarize + extract action items with a short prompt
  let summary = ''
  let actionItems: Array<{ id: string; text: string; owner?: string; due?: string }> = []
  try {
    const content = transcriptText.slice(0, 6000)
    const instructions = `Summarize the transcript in <=80 words and extract up to 5 action items as JSON with keys: summary, actionItems:[{id,text,owner?,due?}]. Return ONLY JSON.`
    const resp = await openai.chat.completions.create({
      model: aiConfig.defaultModel,
      messages: [
        { role: 'system', content: 'You are an assistant that returns strict JSON.' },
        { role: 'user', content: `${instructions}\n\nTRANSCRIPT:\n${content}` },
      ],
    })
    const text = resp?.choices?.[0]?.message?.content ?? ''
    try {
      const parsed = JSON.parse(text)
      summary = String(parsed?.summary ?? '')
      const items = Array.isArray(parsed?.actionItems) ? parsed.actionItems : []
      actionItems = items.map((it: any, i: number) => ({
        id: String(it?.id ?? i + 1),
        text: String(it?.text ?? ''),
        owner: it?.owner ? String(it.owner) : undefined,
        due: it?.due ? String(it.due) : undefined,
      }))
    } catch {
      summary = text.slice(0, 300)
      actionItems = []
    }
  } catch (err) {
    // Non-fatal; return transcript only
  }

  return NextResponse.json({
    transcript: transcriptText,
    summary,
    actionItems,
  })
}

function serializeError(err: unknown) {
  if (err && typeof err === 'object') {
    const e = err as any
    return { name: e.name, message: e.message, code: e.code, status: e.status }
  }
  return { message: String(err) }
}
