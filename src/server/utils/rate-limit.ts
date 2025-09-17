type Result = { allowed: boolean; headers?: Record<string, string> }

// Simple fixed-window limiter. Uses Redis if available, else in-memory Map.
class RateLimiter {
  private memory = new Map<string, { count: number; resetAt: number }>()
  private redis: any | null = null

  constructor() {
    if (process.env.REDIS_URL) {
      try {
        const IORedis = require('ioredis')
        this.redis = new IORedis(process.env.REDIS_URL)
      } catch { this.redis = null }
    }
  }

  async allow(key: string, limit = 60, windowMs = 60_000): Promise<Result> {
    const now = Date.now()
    if (this.redis) {
      const k = `rl:${key}:${Math.floor(now / windowMs)}`
      const count = await this.redis.incr(k)
      if (count === 1) await this.redis.pexpire(k, windowMs)
      const remaining = Math.max(limit - count, 0)
      const reset = Math.ceil((Math.floor(now / windowMs) + 1) * windowMs)
      const headers = this.headers(limit, remaining, reset)
      return { allowed: count <= limit, headers }
    }

    const bucket = this.memory.get(key)
    if (!bucket || now >= bucket.resetAt) {
      this.memory.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, headers: this.headers(limit, limit - 1, now + windowMs) }
    }
    bucket.count += 1
    const remaining = Math.max(limit - bucket.count, 0)
    return { allowed: bucket.count <= limit, headers: this.headers(limit, remaining, bucket.resetAt) }
  }

  private headers(limit: number, remaining: number, resetAt: number) {
    return {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    }
  }
}

const globalRL = globalThis as unknown as { __rl?: RateLimiter }
export const rateLimiter = (globalRL.__rl ??= new RateLimiter())

