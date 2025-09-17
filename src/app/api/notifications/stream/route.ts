import { NextResponse } from 'next/server'
import { requireAuth } from '@/server/modules/organization/api-guard'
import { pushBroker } from '@/server/modules/notifications/push'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (event: string, data: any) => {
        controller.enqueue(enc.encode(`event: ${event}\n`))
        if (data?.id) controller.enqueue(enc.encode(`id: ${String(data.id)}\n`))
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Heartbeat to keep connections alive behind proxies
      const hb = setInterval(() => controller.enqueue(enc.encode(': ping\n\n')), 25000)

      const unsubscribe = pushBroker.subscribe(ctx.userId, (payload) => {
        send('message', payload)
      })

      // Send an initial hello
      send('hello', { ok: true, userId: ctx.userId })

      return () => {
        clearInterval(hb)
        unsubscribe()
      }
    },
    cancel(reason) {
      // no-op
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
