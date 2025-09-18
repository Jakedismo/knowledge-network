import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { RateLimitConfig, RateLimitExceededException, IntegrationError } from './types';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

interface RateLimitEntry {
  key: string;
  windowStart: number;
  requestCount: number;
  limit: number;
  windowMs: number;
}

interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  averageRequestsPerMinute: number;
  topConsumers: Array<{ key: string; requests: number }>;
}

type RateLimitAlgorithm = 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';

interface RateLimiterOptions {
  algorithm?: RateLimitAlgorithm;
  keyPrefix?: string;
  enableDistributed?: boolean;
  enableStats?: boolean;
  globalLimits?: RateLimitConfig;
}

export class RateLimiterService extends EventEmitter {
  private redis: Redis;
  private localCache: Map<string, RateLimitEntry> = new Map();
  private readonly algorithm: RateLimitAlgorithm;
  private readonly keyPrefix: string;
  private readonly enableDistributed: boolean;
  private readonly enableStats: boolean;
  private readonly globalLimits?: RateLimitConfig;
  private readonly STATS_KEY = 'rate_limit:stats';
  private readonly BUCKET_KEY_PREFIX = 'rate_limit:bucket';
  private readonly WINDOW_KEY_PREFIX = 'rate_limit:window';
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(options?: RateLimiterOptions, redisUrl?: string) {
    super();
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.algorithm = options?.algorithm || 'token-bucket';
    this.keyPrefix = options?.keyPrefix || 'rate_limit';
    this.enableDistributed = options?.enableDistributed ?? true;
    this.enableStats = options?.enableStats ?? true;
    this.globalLimits = options?.globalLimits;

    if (this.enableStats) {
      this.startStatsCollection();
    }
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(
    resource: string,
    identifier: string,
    config?: RateLimitConfig
  ): Promise<RateLimitInfo> {
    const key = this.buildKey(resource, identifier);
    const limits = config || this.globalLimits || { windowMs: 60000, maxRequests: 100 };

    let rateLimitInfo: RateLimitInfo;

    switch (this.algorithm) {
      case 'token-bucket':
        rateLimitInfo = await this.checkTokenBucket(key, limits);
        break;
      case 'sliding-window':
        rateLimitInfo = await this.checkSlidingWindow(key, limits);
        break;
      case 'fixed-window':
        rateLimitInfo = await this.checkFixedWindow(key, limits);
        break;
      case 'leaky-bucket':
        rateLimitInfo = await this.checkLeakyBucket(key, limits);
        break;
      default:
        throw new IntegrationError(`Unknown rate limit algorithm: ${this.algorithm}`);
    }

    // Record stats
    if (this.enableStats) {
      await this.recordStats(key, rateLimitInfo.remaining === 0);
    }

    // Check if limit exceeded
    if (rateLimitInfo.remaining === 0) {
      this.emit('rate_limit.exceeded', { resource, identifier, key, info: rateLimitInfo });
      throw new RateLimitExceededException(
        `Rate limit exceeded. Retry after ${rateLimitInfo.retryAfter} seconds`
      );
    }

    return rateLimitInfo;
  }

  /**
   * Token bucket algorithm implementation
   */
  private async checkTokenBucket(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const bucketKey = `${this.BUCKET_KEY_PREFIX}:${key}`;
    const capacity = config.maxRequests;
    const refillRate = capacity / (config.windowMs / 1000); // tokens per second
    const now = Date.now();

    if (this.enableDistributed) {
      // Use Redis for distributed rate limiting
      const result = await this.redis.eval(
        `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local requested = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        -- Calculate tokens to add based on time passed
        local time_passed = (now - last_refill) / 1000
        local tokens_to_add = time_passed * refill_rate
        tokens = math.min(capacity, tokens + tokens_to_add)

        local allowed = 0
        local remaining = tokens

        if tokens >= requested then
          allowed = 1
          remaining = tokens - requested
          redis.call('HMSET', key, 'tokens', remaining, 'last_refill', now)
          redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 60)
        end

        return {allowed, remaining, capacity}
        `,
        1,
        bucketKey,
        capacity,
        refillRate,
        now,
        1
      ) as [number, number, number];

      const [allowed, remaining, limit] = result;
      const reset = now + Math.ceil((capacity - remaining) / refillRate * 1000);
      const retryAfter = allowed === 0 ? Math.ceil(1 / refillRate) : undefined;

      return { limit, remaining, reset, retryAfter };
    } else {
      // Local implementation for single instance
      const bucket = this.getLocalBucket(key, capacity, refillRate, now);

      if (bucket.tokens >= 1) {
        bucket.tokens--;
        const reset = now + Math.ceil((capacity - bucket.tokens) / refillRate * 1000);
        return { limit: capacity, remaining: Math.floor(bucket.tokens), reset };
      } else {
        const retryAfter = Math.ceil(1 / refillRate);
        const reset = now + retryAfter * 1000;
        return { limit: capacity, remaining: 0, reset, retryAfter };
      }
    }
  }

  /**
   * Sliding window algorithm implementation
   */
  private async checkSlidingWindow(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const windowKey = `${this.WINDOW_KEY_PREFIX}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    if (this.enableDistributed) {
      // Use Redis sorted set for sliding window
      const result = await this.redis.eval(
        `
        local key = KEYS[1]
        local window_start = tonumber(ARGV[1])
        local now = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local window_ms = tonumber(ARGV[4])

        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

        -- Count current requests in window
        local current = redis.call('ZCARD', key)

        if current < limit then
          -- Add new request
          redis.call('ZADD', key, now, now)
          redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 60)
          return {1, limit - current - 1, now + window_ms}
        else
          -- Get oldest request to calculate retry after
          local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
          local retry_after = 0
          if #oldest > 0 then
            retry_after = math.ceil((tonumber(oldest[2]) + window_ms - now) / 1000)
          end
          return {0, 0, now + window_ms, retry_after}
        end
        `,
        1,
        windowKey,
        windowStart,
        now,
        config.maxRequests,
        config.windowMs
      ) as number[];

      const [allowed, remaining, reset, retryAfter] = result;
      return {
        limit: config.maxRequests,
        remaining,
        reset,
        retryAfter: retryAfter || undefined,
      };
    } else {
      // Local sliding window implementation
      const entry = this.localCache.get(key);
      const requests = this.getRequestsInWindow(entry, windowStart, now);

      if (requests.length < config.maxRequests) {
        requests.push(now);
        this.updateLocalCache(key, requests, config);
        return {
          limit: config.maxRequests,
          remaining: config.maxRequests - requests.length,
          reset: now + config.windowMs,
        };
      } else {
        const oldestRequest = Math.min(...requests);
        const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);
        return {
          limit: config.maxRequests,
          remaining: 0,
          reset: now + config.windowMs,
          retryAfter,
        };
      }
    }
  }

  /**
   * Fixed window algorithm implementation
   */
  private async checkFixedWindow(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const windowKey = `${this.WINDOW_KEY_PREFIX}:${key}`;
    const now = Date.now();
    const currentWindow = Math.floor(now / config.windowMs);
    const windowStart = currentWindow * config.windowMs;
    const windowEnd = windowStart + config.windowMs;

    if (this.enableDistributed) {
      const result = await this.redis.eval(
        `
        local key = KEYS[1]
        local window_key = ARGV[1]
        local limit = tonumber(ARGV[2])
        local ttl = tonumber(ARGV[3])

        local current_window = redis.call('HGET', key, 'window')
        local count = redis.call('HGET', key, 'count')

        if current_window ~= window_key then
          -- New window, reset count
          redis.call('HSET', key, 'window', window_key, 'count', 1)
          redis.call('EXPIRE', key, ttl)
          return {1, limit - 1}
        else
          count = tonumber(count) or 0
          if count < limit then
            redis.call('HINCRBY', key, 'count', 1)
            return {1, limit - count - 1}
          else
            return {0, 0}
          end
        end
        `,
        1,
        windowKey,
        `${currentWindow}`,
        config.maxRequests,
        Math.ceil(config.windowMs / 1000) + 60
      ) as [number, number];

      const [allowed, remaining] = result;
      const retryAfter = allowed === 0 ? Math.ceil((windowEnd - now) / 1000) : undefined;

      return {
        limit: config.maxRequests,
        remaining,
        reset: windowEnd,
        retryAfter,
      };
    } else {
      // Local fixed window implementation
      const entry = this.localCache.get(key);

      if (!entry || entry.windowStart !== windowStart) {
        // New window
        this.localCache.set(key, {
          key,
          windowStart,
          requestCount: 1,
          limit: config.maxRequests,
          windowMs: config.windowMs,
        });

        return {
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          reset: windowEnd,
        };
      } else if (entry.requestCount < config.maxRequests) {
        entry.requestCount++;
        return {
          limit: config.maxRequests,
          remaining: config.maxRequests - entry.requestCount,
          reset: windowEnd,
        };
      } else {
        const retryAfter = Math.ceil((windowEnd - now) / 1000);
        return {
          limit: config.maxRequests,
          remaining: 0,
          reset: windowEnd,
          retryAfter,
        };
      }
    }
  }

  /**
   * Leaky bucket algorithm implementation
   */
  private async checkLeakyBucket(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const bucketKey = `${this.BUCKET_KEY_PREFIX}:${key}`;
    const capacity = config.maxRequests;
    const leakRate = capacity / (config.windowMs / 1000); // requests per second
    const now = Date.now();

    if (this.enableDistributed) {
      const result = await this.redis.eval(
        `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local leak_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local bucket = redis.call('HMGET', key, 'level', 'last_leak')
        local level = tonumber(bucket[1]) or 0
        local last_leak = tonumber(bucket[2]) or now

        -- Calculate how much has leaked
        local time_passed = (now - last_leak) / 1000
        local leaked = time_passed * leak_rate
        level = math.max(0, level - leaked)

        local allowed = 0
        local remaining = capacity - level

        if level < capacity then
          allowed = 1
          level = level + 1
          redis.call('HMSET', key, 'level', level, 'last_leak', now)
          redis.call('EXPIRE', key, math.ceil(capacity / leak_rate) + 60)
        end

        return {allowed, math.floor(remaining - 1), capacity}
        `,
        1,
        bucketKey,
        capacity,
        leakRate,
        now
      ) as [number, number, number];

      const [allowed, remaining, limit] = result;
      const reset = now + Math.ceil((capacity - remaining) / leakRate * 1000);
      const retryAfter = allowed === 0 ? Math.ceil(1 / leakRate) : undefined;

      return { limit, remaining: Math.max(0, remaining), reset, retryAfter };
    } else {
      // Local implementation would follow similar pattern
      return this.checkTokenBucket(key, config); // Fallback to token bucket for simplicity
    }
  }

  /**
   * Get rate limit info without consuming
   */
  async getRateLimitInfo(
    resource: string,
    identifier: string,
    config?: RateLimitConfig
  ): Promise<RateLimitInfo> {
    const key = this.buildKey(resource, identifier);
    const limits = config || this.globalLimits || { windowMs: 60000, maxRequests: 100 };

    // Similar to checkLimit but without consuming tokens/incrementing counters
    const bucketKey = `${this.BUCKET_KEY_PREFIX}:${key}`;

    if (this.algorithm === 'token-bucket' && this.enableDistributed) {
      const bucket = await this.redis.hgetall(bucketKey);
      const capacity = limits.maxRequests;
      const refillRate = capacity / (limits.windowMs / 1000);
      const now = Date.now();

      const tokens = parseFloat(bucket.tokens || String(capacity));
      const lastRefill = parseInt(bucket.last_refill || String(now));

      const timePassed = (now - lastRefill) / 1000;
      const tokensToAdd = timePassed * refillRate;
      const currentTokens = Math.min(capacity, tokens + tokensToAdd);

      const reset = now + Math.ceil((capacity - currentTokens) / refillRate * 1000);

      return {
        limit: capacity,
        remaining: Math.floor(currentTokens),
        reset,
      };
    }

    // Default fallback
    return {
      limit: limits.maxRequests,
      remaining: limits.maxRequests,
      reset: Date.now() + limits.windowMs,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(resource: string, identifier: string): Promise<void> {
    const key = this.buildKey(resource, identifier);
    const bucketKey = `${this.BUCKET_KEY_PREFIX}:${key}`;
    const windowKey = `${this.WINDOW_KEY_PREFIX}:${key}`;

    if (this.enableDistributed) {
      await Promise.all([
        this.redis.del(bucketKey),
        this.redis.del(windowKey),
      ]);
    }

    this.localCache.delete(key);
    this.emit('rate_limit.reset', { resource, identifier, key });
  }

  /**
   * Get rate limit headers for HTTP response
   */
  getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(info.limit),
      'X-RateLimit-Remaining': String(info.remaining),
      'X-RateLimit-Reset': String(Math.ceil(info.reset / 1000)),
    };

    if (info.retryAfter !== undefined) {
      headers['Retry-After'] = String(info.retryAfter);
    }

    // Standard rate limit headers (draft-ietf-httpapi-ratelimit-headers)
    headers['RateLimit-Limit'] = String(info.limit);
    headers['RateLimit-Remaining'] = String(info.remaining);
    headers['RateLimit-Reset'] = new Date(info.reset).toISOString();

    return headers;
  }

  /**
   * Get rate limit statistics
   */
  async getStats(resource?: string): Promise<RateLimitStats> {
    if (!this.enableStats) {
      throw new IntegrationError('Statistics collection is disabled');
    }

    const stats = await this.redis.hgetall(`${this.STATS_KEY}:summary`);
    const topConsumers = await this.redis.zrevrange(
      `${this.STATS_KEY}:top_consumers`,
      0,
      9,
      'WITHSCORES'
    );

    const consumers: Array<{ key: string; requests: number }> = [];
    for (let i = 0; i < topConsumers.length; i += 2) {
      consumers.push({
        key: topConsumers[i],
        requests: parseInt(topConsumers[i + 1]),
      });
    }

    const totalRequests = parseInt(stats.total_requests || '0');
    const blockedRequests = parseInt(stats.blocked_requests || '0');
    const timeWindow = parseInt(stats.time_window || '60000');
    const averageRequestsPerMinute = (totalRequests / (timeWindow / 60000));

    return {
      totalRequests,
      blockedRequests,
      averageRequestsPerMinute,
      topConsumers: consumers,
    };
  }

  /**
   * Configure rate limits for specific resources
   */
  async configureResourceLimit(
    resource: string,
    config: RateLimitConfig
  ): Promise<void> {
    const configKey = `${this.keyPrefix}:config:${resource}`;
    await this.redis.hset(configKey, {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
    });

    this.emit('rate_limit.configured', { resource, config });
  }

  /**
   * Get configured rate limit for resource
   */
  async getResourceLimit(resource: string): Promise<RateLimitConfig | null> {
    const configKey = `${this.keyPrefix}:config:${resource}`;
    const config = await this.redis.hgetall(configKey);

    if (!config.windowMs || !config.maxRequests) {
      return null;
    }

    return {
      windowMs: parseInt(config.windowMs),
      maxRequests: parseInt(config.maxRequests),
    };
  }

  // Private helper methods

  private buildKey(resource: string, identifier: string): string {
    return `${this.keyPrefix}:${resource}:${identifier}`;
  }

  private getLocalBucket(
    key: string,
    capacity: number,
    refillRate: number,
    now: number
  ): TokenBucket {
    const cached = this.localCache.get(key);

    if (!cached) {
      const bucket: TokenBucket = {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRate,
      };
      this.localCache.set(key, {
        key,
        windowStart: now,
        requestCount: 0,
        limit: capacity,
        windowMs: 0,
      });
      return bucket;
    }

    // Refill tokens based on time passed
    const timePassed = (now - cached.windowStart) / 1000;
    const tokensToAdd = timePassed * refillRate;
    const tokens = Math.min(capacity, (cached.requestCount || capacity) + tokensToAdd);

    return {
      tokens,
      lastRefill: now,
      capacity,
      refillRate,
    };
  }

  private getRequestsInWindow(
    entry: RateLimitEntry | undefined,
    windowStart: number,
    now: number
  ): number[] {
    if (!entry) return [];

    // Simplified: just track count for local implementation
    const requests: number[] = [];
    for (let i = 0; i < (entry.requestCount || 0); i++) {
      requests.push(entry.windowStart + i);
    }
    return requests.filter(time => time >= windowStart);
  }

  private updateLocalCache(
    key: string,
    requests: number[],
    config: RateLimitConfig
  ): void {
    this.localCache.set(key, {
      key,
      windowStart: Math.min(...requests),
      requestCount: requests.length,
      limit: config.maxRequests,
      windowMs: config.windowMs,
    });
  }

  private async recordStats(key: string, blocked: boolean): Promise<void> {
    const pipeline = this.redis.pipeline();

    pipeline.hincrby(`${this.STATS_KEY}:summary`, 'total_requests', 1);
    if (blocked) {
      pipeline.hincrby(`${this.STATS_KEY}:summary`, 'blocked_requests', 1);
    }

    pipeline.zincrby(`${this.STATS_KEY}:top_consumers`, 1, key);
    pipeline.expire(`${this.STATS_KEY}:top_consumers`, 3600); // Keep for 1 hour

    await pipeline.exec();
  }

  private startStatsCollection(): void {
    // Reset stats every hour
    this.statsInterval = setInterval(async () => {
      await this.redis.del(`${this.STATS_KEY}:summary`);
      await this.redis.hset(`${this.STATS_KEY}:summary`, 'time_window', '3600000');
    }, 3600000); // 1 hour
  }

  /**
   * Clean up resources
   */
  async stop(): Promise<void> {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    await this.redis.quit();
  }
}