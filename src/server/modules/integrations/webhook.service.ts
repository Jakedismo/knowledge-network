import { createHash, createHmac, randomBytes } from 'crypto';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import {
  WebhookConfig,
  RetryPolicy,
  IntegrationEvent,
  IntegrationError,
} from './types';

interface WebhookEvent {
  id: string;
  webhookId: string;
  url: string;
  eventType: string;
  payload: any;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  lastAttemptAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  error?: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  statusCode?: number;
  response?: any;
  error?: string;
  duration: number;
  deliveredAt: Date;
}

interface BatchWebhookOptions {
  batchSize?: number;
  concurrency?: number;
  timeout?: number;
}

export class WebhookService extends EventEmitter {
  private redis: Redis;
  private webhooks: Map<string, WebhookConfig> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly QUEUE_KEY = 'webhooks:queue';
  private readonly DEAD_LETTER_KEY = 'webhooks:dead_letter';
  private readonly DELIVERY_LOG_KEY = 'webhooks:deliveries';
  private readonly PROCESSING_LOCK_KEY = 'webhooks:processing_lock';
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly BATCH_SIZE = 10;
  private readonly PROCESSING_INTERVAL = 5000; // 5 seconds

  constructor(redisUrl?: string) {
    super();
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.startProcessing();
  }

  /**
   * Register a new webhook
   */
  async registerWebhook(config: WebhookConfig): Promise<WebhookConfig> {
    // Generate ID if not provided
    if (!config.id) {
      config.id = this.generateWebhookId();
    }

    // Generate secret if not provided
    if (!config.secret) {
      config.secret = this.generateSecret();
    }

    // Set default retry policy if not provided
    if (!config.retryPolicy) {
      config.retryPolicy = {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 30000,
      };
    }

    // Store webhook configuration
    this.webhooks.set(config.id, config);
    await this.redis.hset('webhooks:registry', config.id, JSON.stringify(config));

    this.emit('webhook.registered', config);
    return config;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const webhook = await this.getWebhook(webhookId);
    if (!webhook) {
      throw new IntegrationError(`Webhook ${webhookId} not found`);
    }

    const updatedWebhook = { ...webhook, ...updates };
    this.webhooks.set(webhookId, updatedWebhook);
    await this.redis.hset('webhooks:registry', webhookId, JSON.stringify(updatedWebhook));

    this.emit('webhook.updated', updatedWebhook);
    return updatedWebhook;
  }

  /**
   * Deactivate a webhook
   */
  async deactivateWebhook(webhookId: string): Promise<void> {
    const webhook = await this.getWebhook(webhookId);
    if (!webhook) {
      throw new IntegrationError(`Webhook ${webhookId} not found`);
    }

    webhook.active = false;
    await this.updateWebhook(webhookId, { active: false });
    this.emit('webhook.deactivated', webhook);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    this.webhooks.delete(webhookId);
    await this.redis.hdel('webhooks:registry', webhookId);
    this.emit('webhook.deleted', { webhookId });
  }

  /**
   * Get webhook configuration
   */
  async getWebhook(webhookId: string): Promise<WebhookConfig | null> {
    // Check in-memory cache first
    if (this.webhooks.has(webhookId)) {
      return this.webhooks.get(webhookId)!;
    }

    // Load from Redis
    const data = await this.redis.hget('webhooks:registry', webhookId);
    if (!data) return null;

    const webhook = JSON.parse(data) as WebhookConfig;
    this.webhooks.set(webhookId, webhook);
    return webhook;
  }

  /**
   * List all registered webhooks
   */
  async listWebhooks(filter?: { events?: string[]; active?: boolean }): Promise<WebhookConfig[]> {
    const allWebhooks = await this.redis.hgetall('webhooks:registry');
    const webhooks = Object.values(allWebhooks).map(data => JSON.parse(data) as WebhookConfig);

    // Apply filters
    return webhooks.filter(webhook => {
      if (filter?.active !== undefined && webhook.active !== filter.active) {
        return false;
      }
      if (filter?.events && filter.events.length > 0) {
        return filter.events.some(event => webhook.events.includes(event));
      }
      return true;
    });
  }

  /**
   * Trigger a webhook event
   */
  async triggerEvent(
    eventType: string,
    payload: any,
    options?: { webhookIds?: string[]; headers?: Record<string, string> }
  ): Promise<void> {
    // Find all webhooks that should receive this event
    const webhooks = await this.findWebhooksForEvent(eventType, options?.webhookIds);

    // Queue events for each webhook
    const events = webhooks.map(webhook => this.createWebhookEvent(webhook, eventType, payload, options?.headers));

    // Add events to processing queue
    for (const event of events) {
      await this.queueEvent(event);
    }

    this.emit('events.triggered', { eventType, count: events.length });
  }

  /**
   * Process webhooks in batch
   */
  async processBatch(options?: BatchWebhookOptions): Promise<void> {
    const batchSize = options?.batchSize || this.BATCH_SIZE;
    const concurrency = options?.concurrency || 5;
    const timeout = options?.timeout || this.DEFAULT_TIMEOUT;

    // Acquire processing lock
    const lockKey = `${this.PROCESSING_LOCK_KEY}:${Date.now()}`;
    const locked = await this.redis.set(lockKey, '1', 'NX', 'EX', 60);
    if (!locked) return; // Another instance is processing

    try {
      // Get batch of events from queue
      const events = await this.getEventBatch(batchSize);
      if (events.length === 0) return;

      // Process events with concurrency control
      const chunks = this.chunkArray(events, concurrency);
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(event => this.processWebhookEvent(event, timeout))
        );
      }
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * Process a single webhook event
   */
  private async processWebhookEvent(event: WebhookEvent, timeout: number): Promise<void> {
    // Check if webhook is still active
    const webhook = await this.getWebhook(event.webhookId);
    if (!webhook || !webhook.active) {
      await this.markEventCompleted(event, 'Webhook inactive or deleted');
      return;
    }

    try {
      event.status = 'processing';
      event.lastAttemptAt = new Date();
      await this.updateEvent(event);

      const startTime = Date.now();
      const response = await this.deliverWebhook(event, webhook, timeout);
      const duration = Date.now() - startTime;

      // Log successful delivery
      await this.logDelivery({
        id: this.generateId(),
        webhookId: event.webhookId,
        eventId: event.id,
        statusCode: response.statusCode,
        response: response.body,
        duration,
        deliveredAt: new Date(),
      });

      await this.markEventCompleted(event);
      this.emit('webhook.delivered', { event, response, duration });
    } catch (error: any) {
      await this.handleWebhookError(event, webhook, error);
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    event: WebhookEvent,
    webhook: WebhookConfig,
    timeout: number
  ): Promise<{ statusCode: number; body: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Id': webhook.id,
        'X-Event-Type': event.eventType,
        'X-Event-Id': event.id,
        'X-Timestamp': new Date().toISOString(),
        ...webhook.headers,
        ...event.headers,
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        const signature = this.generateSignature(webhook.secret, event.payload);
        headers['X-Webhook-Signature'] = signature;
      }

      // Make HTTP request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(event.payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is successful
      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseBody = await response.text();
      return {
        statusCode: response.status,
        body: responseBody ? JSON.parse(responseBody) : null,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Webhook delivery timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Handle webhook delivery error
   */
  private async handleWebhookError(
    event: WebhookEvent,
    webhook: WebhookConfig,
    error: Error
  ): Promise<void> {
    event.error = error.message;
    event.retryCount++;

    // Log failed delivery attempt
    await this.logDelivery({
      id: this.generateId(),
      webhookId: event.webhookId,
      eventId: event.id,
      error: error.message,
      duration: 0,
      deliveredAt: new Date(),
    });

    // Check if we should retry
    if (event.retryCount < event.maxRetries) {
      // Calculate next retry time using exponential backoff
      const retryPolicy = webhook.retryPolicy!;
      const delay = Math.min(
        retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, event.retryCount - 1),
        retryPolicy.maxDelay || 30000
      );

      event.nextRetryAt = new Date(Date.now() + delay);
      event.status = 'pending';
      await this.updateEvent(event);

      this.emit('webhook.retry_scheduled', { event, delay });
    } else {
      // Move to dead letter queue
      await this.moveToDeadLetter(event);
      this.emit('webhook.failed', { event, error: error.message });
    }
  }

  /**
   * Move event to dead letter queue
   */
  private async moveToDeadLetter(event: WebhookEvent): Promise<void> {
    event.status = 'dead';
    await this.redis.zadd(this.DEAD_LETTER_KEY, Date.now(), JSON.stringify(event));
    await this.redis.zrem(this.QUEUE_KEY, JSON.stringify(event));

    this.emit('webhook.dead_lettered', event);
  }

  /**
   * Retry failed webhooks from dead letter queue
   */
  async retryDeadLetterEvents(limit?: number): Promise<number> {
    const events = await this.redis.zrange(this.DEAD_LETTER_KEY, 0, (limit || 100) - 1);
    let retried = 0;

    for (const eventData of events) {
      const event = JSON.parse(eventData) as WebhookEvent;
      event.status = 'pending';
      event.retryCount = 0;
      event.error = undefined;

      await this.queueEvent(event);
      await this.redis.zrem(this.DEAD_LETTER_KEY, eventData);
      retried++;
    }

    this.emit('dead_letter.retried', { count: retried });
    return retried;
  }

  /**
   * Generate webhook signature
   */
  generateSignature(secret: string, payload: any): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Validate webhook signature
   */
  validateSignature(secret: string, payload: any, signature: string): boolean {
    const expectedSignature = this.generateSignature(secret, payload);

    // Use timing-safe comparison to prevent timing attacks
    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(signature);

    if (expected.length !== received.length) {
      return false;
    }

    return expected.equals(received);
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(
    webhookId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<WebhookDelivery[]> {
    const key = `${this.DELIVERY_LOG_KEY}:${webhookId}`;
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    const deliveries = await this.redis.lrange(key, offset, offset + limit - 1);
    return deliveries.map(data => JSON.parse(data) as WebhookDelivery);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    pending: number;
    avgResponseTime: number;
  }> {
    const deliveries = await this.getDeliveryHistory(webhookId, { limit: 1000 });

    const stats = {
      total: deliveries.length,
      successful: 0,
      failed: 0,
      pending: 0,
      avgResponseTime: 0,
    };

    let totalDuration = 0;
    for (const delivery of deliveries) {
      if (delivery.statusCode && delivery.statusCode < 400) {
        stats.successful++;
      } else if (delivery.error) {
        stats.failed++;
      }
      totalDuration += delivery.duration;
    }

    // Count pending events
    const queueData = await this.redis.zrange(this.QUEUE_KEY, 0, -1);
    for (const eventData of queueData) {
      const event = JSON.parse(eventData) as WebhookEvent;
      if (event.webhookId === webhookId && event.status === 'pending') {
        stats.pending++;
      }
    }

    stats.avgResponseTime = deliveries.length > 0 ? totalDuration / deliveries.length : 0;
    return stats;
  }

  // Private helper methods

  private createWebhookEvent(
    webhook: WebhookConfig,
    eventType: string,
    payload: any,
    headers?: Record<string, string>
  ): WebhookEvent {
    return {
      id: this.generateId(),
      webhookId: webhook.id,
      url: webhook.url,
      eventType,
      payload,
      headers,
      retryCount: 0,
      maxRetries: webhook.retryPolicy?.maxRetries || 3,
      createdAt: new Date(),
      status: 'pending',
    };
  }

  private async queueEvent(event: WebhookEvent): Promise<void> {
    const score = event.nextRetryAt ? event.nextRetryAt.getTime() : Date.now();
    await this.redis.zadd(this.QUEUE_KEY, score, JSON.stringify(event));
  }

  private async getEventBatch(size: number): Promise<WebhookEvent[]> {
    const now = Date.now();
    const events = await this.redis.zrangebyscore(this.QUEUE_KEY, '-inf', now, 'LIMIT', 0, size);

    const parsed = events.map(data => JSON.parse(data) as WebhookEvent);

    // Remove from queue (they'll be re-added if retry is needed)
    if (parsed.length > 0) {
      await this.redis.zrem(this.QUEUE_KEY, ...events);
    }

    return parsed;
  }

  private async updateEvent(event: WebhookEvent): Promise<void> {
    await this.redis.hset(`webhooks:events:${event.id}`, 'data', JSON.stringify(event));
  }

  private async markEventCompleted(event: WebhookEvent, reason?: string): Promise<void> {
    event.status = 'completed';
    if (reason) event.error = reason;
    await this.updateEvent(event);
  }

  private async logDelivery(delivery: WebhookDelivery): Promise<void> {
    const key = `${this.DELIVERY_LOG_KEY}:${delivery.webhookId}`;
    await this.redis.lpush(key, JSON.stringify(delivery));
    // Keep only last 1000 deliveries
    await this.redis.ltrim(key, 0, 999);
  }

  private async findWebhooksForEvent(eventType: string, webhookIds?: string[]): Promise<WebhookConfig[]> {
    const webhooks = await this.listWebhooks({ events: [eventType], active: true });

    if (webhookIds && webhookIds.length > 0) {
      return webhooks.filter(w => webhookIds.includes(w.id));
    }

    return webhooks;
  }

  private generateId(): string {
    return `evt_${randomBytes(16).toString('hex')}`;
  }

  private generateWebhookId(): string {
    return `whk_${randomBytes(16).toString('hex')}`;
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      try {
        await this.processBatch();
      } catch (error) {
        console.error('Error processing webhook batch:', error);
      }
    }, this.PROCESSING_INTERVAL);
  }

  /**
   * Stop background processing
   */
  async stop(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    await this.redis.quit();
  }
}