import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;
  private hits: number = 0;
  private misses: number = 0;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true
    });

    // Handle connection events
    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Redis cache connected');
    });

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
      this.isConnected = false;
    });

    // Attempt to connect
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.warn('Redis cache unavailable, running without cache:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const value = await this.redis.get(key);
      if (value) {
        this.hits++;
        return JSON.parse(value);
      }
      this.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries for a workspace
   */
  async clearWorkspace(workspaceId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const pattern = `*${workspaceId}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Cleared ${keys.length} cache entries for workspace ${workspaceId}`);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear all cache entries matching a pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Cleared ${keys.length} cache entries matching pattern ${pattern}`);
      }
    } catch (error) {
      console.error('Cache clear pattern error:', error);
    }
  }

  /**
   * Get cache hit rate
   */
  async getHitRate(): Promise<number> {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    connected: boolean;
  }> {
    let size = 0;

    if (this.isConnected) {
      try {
        const info = await this.redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) {
          size = parseInt(match[1], 10);
        }
      } catch (error) {
        console.error('Failed to get Redis memory info:', error);
      }
    }

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: await this.getHitRate(),
      size,
      connected: this.isConnected
    };
  }

  /**
   * Increment a counter in cache (for rate limiting)
   */
  async increment(key: string, ttlSeconds: number = 60): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, ttlSeconds);
      const results = await multi.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Store a search result with automatic expiration
   */
  async cacheSearchResult(
    key: string,
    result: any,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<void> {
    const ttl = options.ttl || 60; // Default 1 minute

    await this.set(key, result, ttl);

    // Store tags for bulk invalidation
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await this.redis.sadd(`tag:${tag}`, key);
        await this.redis.expire(`tag:${tag}`, ttl);
      }
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateTag(tag: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
        console.log(`Invalidated ${keys.length} cache entries with tag ${tag}`);
      }
    } catch (error) {
      console.error('Cache tag invalidation error:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(data: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    if (!this.isConnected) return;

    console.log(`Warming up cache with ${data.length} entries`);

    const pipeline = this.redis.pipeline();

    for (const item of data) {
      pipeline.setex(item.key, item.ttl || 300, JSON.stringify(item.value));
    }

    try {
      await pipeline.exec();
      console.log('Cache warm-up complete');
    } catch (error) {
      console.error('Cache warm-up error:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.isConnected) {
      await this.redis.quit();
      this.isConnected = false;
    }
  }
}
// @ts-nocheck
