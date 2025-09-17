// Realtime Collaboration Protocol (server ↔ client)
// Matches src/lib/editor/collaboration/websocket-provider.ts

export type SyncMessage = {
  type: 'sync'
  roomId: string
  update: number[] // Uint8Array serialized as number[]
}

export type UpdateMessage = {
  type: 'update'
  roomId: string
  update: number[]
}

export type AwarenessMessage = {
  type: 'awareness'
  roomId: string
  payload: number[]
}

export type ClientMessage = SyncMessage | UpdateMessage | AwarenessMessage
export type ServerMessage = SyncMessage | UpdateMessage | AwarenessMessage

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.type !== 'string' || typeof v.roomId !== 'string') return false
  if (v.type === 'sync' || v.type === 'update') {
    return Array.isArray(v.update)
  }
  if (v.type === 'awareness') {
    return Array.isArray(v.payload)
  }
  return false
}

