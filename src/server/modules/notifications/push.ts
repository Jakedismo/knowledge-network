import { EventEmitter } from 'events'

export type PushPayload = { id?: string; kind: string; data: unknown }

export interface PushBroker {
  publish(userId: string, payload: PushPayload): void
  subscribe(userId: string, onMessage: (payload: PushPayload) => void): () => void
}

function genId() {
  // Simple ULID-like: time base36 + random base36
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 10)
  return `${t}${r}`
}

class InMemoryPushBroker implements PushBroker {
  private bus = new EventEmitter()
  publish(userId: string, payload: PushPayload) {
    const withId = payload.id ? payload : { ...payload, id: genId() }
    this.bus.emit(this.key(userId), withId)
  }
  subscribe(userId: string, onMessage: (payload: PushPayload) => void) {
    const k = this.key(userId)
    this.bus.on(k, onMessage)
    return () => this.bus.off(k, onMessage)
  }
  private key(userId: string) { return `user:${userId}` }
}

function createBroker(): PushBroker {
  const useRedis = !!process.env.REDIS_URL
  if (useRedis) {
    try {
      const { RedisPushBroker } = require('./push_redis') as { RedisPushBroker: new () => PushBroker }
      return new RedisPushBroker()
    } catch {
      // Fallback silently to in-memory if redis impl is unavailable
    }
  }
  return new InMemoryPushBroker()
}

// Single shared instance across hot reloads
const globalForBroker = globalThis as unknown as { __pushBroker?: PushBroker }
export const pushBroker: PushBroker = (globalForBroker.__pushBroker ??= createBroker())
