/*
 * Bun WebSocket server for realtime collaboration (Swarm 2B).
 * Port: 3005 (do not clash with 3001 per guidelines)
 */
import { FileVersionStore } from './storage/version-store'
import { Room } from './room'
import type { ClientMessage } from './protocol'
import * as Y from 'yjs'

// Optional JWT auth (HS256) using shared secret from env JWT_SECRET
import jwt from 'jsonwebtoken'

const PORT = Number(process.env.COLLAB_PORT ?? 3005)
const PATH = process.env.COLLAB_WS_PATH ?? '/ws'
const JWT_SECRET = process.env.JWT_SECRET
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)

const store = new FileVersionStore('data/collab')
const rooms = new Map<string, Room>()

function getOrCreateRoom(id: string): Room {
  let room = rooms.get(id)
  if (!room) {
    room = new Room(id, store)
    rooms.set(id, room)
  }
  return room
}

function verifyToken(token?: string): { sub?: string } | null {
  if (!token) return null
  if (!JWT_SECRET) return null
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

// Start Bun server with WebSocket upgrade
const server = Bun.serve<{ roomId?: string; token?: string }>({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)
    if (url.pathname !== PATH) {
      // basic health and info
      if (url.pathname === '/health') return new Response('ok')
      return new Response('Not Found', { status: 404 })
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': CORS_ORIGINS[0] ?? '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization,Content-Type',
        },
      })
    }

    const roomId = url.searchParams.get('roomId') || url.searchParams.get('room') || ''
    const token = url.searchParams.get('token') || undefined
    const auth = verifyToken(token)
    if (JWT_SECRET && !auth) {
      return new Response('Unauthorized', { status: 401 })
    }

    const ok = server.upgrade(req, { data: { roomId, token } })
    return ok ? undefined as any : new Response('Upgrade failed', { status: 500 })
  },
  websocket: {
    open(ws) {
      const roomId = (ws.data?.roomId as string) || 'default'
      const room = getOrCreateRoom(roomId)
      room.connect(ws)
    },
    message(ws, message) {
      const roomId = (ws.data?.roomId as string) || 'default'
      const room = getOrCreateRoom(roomId)
      if (typeof message !== 'string') return
      room.handleMessage(ws, message)
    },
    close(ws) {
      const roomId = (ws.data?.roomId as string) || 'default'
      const room = rooms.get(roomId)
      room?.disconnect(ws)
    },
  },
})

console.log(`[realtime] listening on ws://localhost:${PORT}${PATH}`)

