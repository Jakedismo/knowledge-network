import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { aiConfig, invokeAgent } from '@/server/modules/ai'
import { requireAIAccess } from '@/server/modules/ai/policy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // AuthZ + RL
  const guard = await requireAIAccess(req, { permission: 'ai:invoke' })
  // If guard returned a Response (rate limit or unauthorized), forward it
  if (guard instanceof Response) return guard

  if (!aiConfig.apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => ({}))) as any
  const { model, system, instructions, promptVars, input: payload, stream } = body ?? {}

  // Non-streamed by default to keep infra simple; streaming via text/event-stream
  if (stream) {
    const iterator = (await invokeAgent({
      model,
      system,
      instructions,
      promptVars,
      input: payload,
      userId: (guard as any).userId,
      workspaceId: (guard as any).workspaceId,
      stream: true,
    })) as AsyncIterable<{ type: string; data: unknown }>

    const encoder = new TextEncoder()
    const streamBody = new ReadableStream({
      async pull(controller) {
        for await (const chunk of iterator) {
          const line = `event: ${chunk.type}\ndata: ${JSON.stringify(chunk.data)}\n\n`
          controller.enqueue(encoder.encode(line))
          if (chunk.type === 'done' || chunk.type === 'error') {
            controller.close()
            return
          }
        }
        controller.close()
      },
    })
    return new Response(streamBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  const res = await invokeAgent({
    model,
    system,
    instructions,
    promptVars,
    input: payload,
    userId: (guard as any).userId,
    workspaceId: (guard as any).workspaceId,
  })
  return NextResponse.json(res)
}

