// @ts-nocheck
/*
 * Elysia wrapper for the realtime collaboration server.
 * Framework-agnostic Room/VersionStore are reused from src/realtime.
 * Requires: `elysia` and `@elysiajs/ws` packages.
 */
import { FileVersionStore } from './storage/version-store'
import { Room } from './room'
import type { ClientMessage } from './protocol'
import jwt from 'jsonwebtoken'

const PORT = Number(process.env.COLLAB_PORT ?? 3005)
const PATH = process.env.COLLAB_WS_PATH ?? '/ws'
const JWT_SECRET = process.env.JWT_SECRET

const store = new FileVersionStore('data/collab')
const rooms = new Map<string, Room>()

function getRoom(id: string): Room {
  let r = rooms.get(id)
  if (!r) {
    r = new Room(id, store)
    rooms.set(id, r)
  }
  return r
}

function verifyToken(token?: string): boolean {
  if (!JWT_SECRET) return true // disabled
  if (!token) return false
  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

async function main() {
  const { Elysia } = await import('elysia')
  const { ws } = await import('@elysiajs/ws')

  const app = new Elysia()
    .use(ws())
    .get('/health', () => 'ok')
    .get('/history/:roomId', async ({ params, query }) => {
      const { roomId } = params as { roomId: string }
      const limit = query?.limit ? Math.max(1, Math.min(200, Number(query.limit))) : 20
      const list = await store.list(roomId, limit)
      return list
    })
    .get('/history/:roomId/latest', async ({ params }) => {
      const { roomId } = params as { roomId: string }
      const data = await store.loadLatest(roomId)
      if (!data) return { ok: false, reason: 'not_found' }
      const meta = (await store.list(roomId, 1))[0]
      return { ok: true, meta, dataB64: Buffer.from(data).toString('base64') }
    })
    .get('/history/:roomId/:version', async ({ params }) => {
      const { roomId, version } = params as { roomId: string; version: string }
      const res = await store.load(roomId, version)
      if (!res) return { ok: false, reason: 'not_found' }
      return { ok: true, meta: res.meta, dataB64: Buffer.from(res.data).toString('base64') }
    })
    .get('/room/:roomId/info', ({ params }) => {
      const { roomId } = params as { roomId: string }
      const r = rooms.get(roomId)
      if (r) {
        const s = r.getStats()
        return { roomId, inMemory: true, participants: s.clients, docClock: s.docClock, awareness: s.awareness }
      }
      return { roomId, inMemory: false, participants: 0, docClock: 0, awareness: 0 }
    })
    .get('/metrics', () => {
      const roomStats = Array.from(rooms.values()).map((r) => r.getStats())
      const lines: string[] = []
      lines.push('# HELP collab_rooms Number of rooms in memory')
      lines.push('# TYPE collab_rooms gauge')
      lines.push(`collab_rooms ${roomStats.length}`)
      lines.push('# HELP collab_room_clients Clients per room')
      lines.push('# TYPE collab_room_clients gauge')
      for (const s of roomStats) lines.push(`collab_room_clients{room_id="${s.id}"} ${s.clients}`)
      lines.push('# HELP collab_doc_clock Yjs document clock per room')
      lines.push('# TYPE collab_doc_clock gauge')
      for (const s of roomStats) lines.push(`collab_doc_clock{room_id="${s.id}"} ${s.docClock}`)
      lines.push('# HELP collab_awareness_states Awareness states per room')
      lines.push('# TYPE collab_awareness_states gauge')
      for (const s of roomStats) lines.push(`collab_awareness_states{room_id="${s.id}"} ${s.awareness}`)
      return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; version=0.0.4' } })
    })
    .ws(PATH, {
      open(ws) {
        // Delay room association until first message (client carries roomId)
        ws.data = { roomId: undefined as string | undefined, authed: false }
      },
      async message(ws, data) {
        if (typeof data !== 'string') return
        let msg: ClientMessage
        try {
          msg = JSON.parse(data)
        } catch {
          return
        }
        if (!msg || (msg.type !== 'sync' && msg.type !== 'update' && msg.type !== 'awareness')) return
        const roomId = msg.roomId
        if (!roomId) return

        if (!ws.data.roomId) {
          // Perform optional auth from query string on first message
          try {
            const url = new URL(ws.raw.url, 'http://localhost')
            const token = url.searchParams.get('token') ?? undefined
            const authHeader = (ws.headers?.get?.('authorization') || ws.headers?.authorization || ws.raw?.headers?.get?.('authorization')) as string | undefined
            const bearer = (authHeader && /^Bearer\s+(.+)$/i.test(authHeader) ? authHeader.replace(/^Bearer\s+/i, '') : undefined) as string | undefined
            if (!verifyToken(bearer || token)) {
              ws.close()
              return
            }
          } catch {
            // ignore parsing errors
          }
          ws.data.roomId = roomId
          const room = getRoom(roomId)
          room.connect(ws)
        }
        const room = getRoom(roomId)
        room.handleMessage(ws, data)
      },
      close(ws) {
        const id = ws.data?.roomId
        if (!id) return
        const room = rooms.get(id)
        room?.disconnect(ws)
      },
    })
    // JSON-RPC route compatible with MCP provider
    .ws('/collab/ws', {
      open(ws) {
        ws.data = { roomId: undefined as string | undefined }
      },
      message(ws, raw) {
        if (typeof raw !== 'string') return
        let msg: any
        try { msg = JSON.parse(raw) } catch { return }
        const method = msg?.method as string
        const params = msg?.params ?? {}
        const id = msg?.id

        const reply = (result: any) => ws.send(JSON.stringify({ jsonrpc: '2.0', id, result }))
        const error = (code: number, message: string) => ws.send(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }))

        if (!method) return
        if (method === 'collab/subscribe') {
          const roomId = params.roomId as string
          if (!roomId) return error(400, 'roomId required')
          // optional token in params or query
          const token = params.token as string | undefined
          const authHeader = (ws.headers?.get?.('authorization') || ws.headers?.authorization || ws.raw?.headers?.get?.('authorization')) as string | undefined
          const bearer = (authHeader && /^Bearer\s+(.+)$/i.test(authHeader) ? authHeader.replace(/^Bearer\s+/i, '') : undefined) as string | undefined
          if (!verifyToken(bearer || token)) return error(401, 'unauthorized')
          ws.data.roomId = roomId
          const room = getRoom(roomId)
          room.connect(ws)
          return reply({ ok: true })
        }

        const roomId = params.roomId as string
        if (!roomId) return error(400, 'roomId required')
        const room = getRoom(roomId)
        if (method === 'collab/sync' || method === 'collab/update') {
          const b64 = params.payloadB64 as string
          if (!b64) return error(400, 'payloadB64 required')
          try {
            const buf = Buffer.from(b64, 'base64')
            const payload = Array.from(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength))
            room.handleMessage(ws, JSON.stringify({ type: method === 'collab/sync' ? 'sync' : 'update', roomId, update: payload }))
            return reply({ applied: true, version: room.getStats().docClock })
          } catch {
            return error(400, 'invalid payload')
          }
        }
        if (method === 'collab/awareness') {
          const b64 = params.payloadB64 as string
          if (!b64) return error(400, 'payloadB64 required')
          try {
            const buf = Buffer.from(b64, 'base64')
            const payload = Array.from(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength))
            room.handleMessage(ws, JSON.stringify({ type: 'awareness', roomId, payload }))
            return reply({ ok: true })
          } catch {
            return error(400, 'invalid payload')
          }
        }
        if (method === 'collab/heartbeat') {
          const ts = params.ts ?? Date.now()
          return reply({ ts, serverTs: Date.now() })
        }
        if (method === 'collab/room.info') {
          const s = room.getStats()
          return reply({ roomId, participants: s.clients })
        }
        return error(400, 'unknown method')
      },
      close(ws) {
        const id = ws.data?.roomId
        if (!id) return
        rooms.get(id)?.disconnect(ws)
      },
    })
    .listen(PORT)

  console.log(`[realtime][elysia] listening on ws://localhost:${PORT}${PATH}`)
}

main().catch((err) => {
  console.error('[realtime][elysia] failed to start', err)
  process.exit(1)
})
