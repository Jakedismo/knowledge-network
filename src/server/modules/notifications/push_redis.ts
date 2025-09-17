import type { PushBroker, PushPayload } from './push'

// Note: 'ioredis' is optional; next.config.js aliases a stub when missing.
// Implementation uses simple Pub/Sub with channel per user.

export class RedisPushBroker implements PushBroker {
  private pub: any
  private sub: any
  private handlers = new Map<string, Set<(p: PushPayload) => void>>()

  constructor() {
    // Lazy require to avoid ESM import issues with stubs
    const IORedis = require('ioredis')
    const url = process.env.REDIS_URL
    this.pub = new IORedis(url)
    this.sub = new IORedis(url)
    this.sub.on('message', (channel: string, message: string) => {
      const payload: PushPayload = JSON.parse(message)
      const set = this.handlers.get(channel)
      if (!set) return
      for (const fn of set) fn(payload)
    })
  }

  publish(userId: string, payload: PushPayload): void {
    const channel = this.key(userId)
    // Ensure id exists; SSE consumers can use it for Last-Event-ID
    const withId = payload.id ? payload : { ...payload, id: this.genId() }
    this.pub.publish(channel, JSON.stringify(withId))
  }

  subscribe(userId: string, onMessage: (payload: PushPayload) => void): () => void {
    const channel = this.key(userId)
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
      this.sub.subscribe(channel)
    }
    const set = this.handlers.get(channel)!
    set.add(onMessage)
    return () => {
      set.delete(onMessage)
      if (set.size === 0) {
        this.sub.unsubscribe(channel)
        this.handlers.delete(channel)
      }
    }
  }

  private key(userId: string) { return `user:${userId}` }
  private genId() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}` }
}

