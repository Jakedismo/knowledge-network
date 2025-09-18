import type {
  AnalyticsMetric,
  AggregatedMetric,
  MetricType,
  AggregationPeriod,
  UserEngagementMetrics,
  ContentMetrics,
  SystemHealthMetrics,
  PerformanceMetric,
  TimeRange
} from '@/types/analytics';
import { format, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class AnalyticsService {
  private static instance: AnalyticsService;
  private metricsBuffer: AnalyticsMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  private constructor() {
    this.startFlushInterval();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  async trackMetric(metric: Omit<AnalyticsMetric, 'id' | 'timestamp'>): Promise<void> {
    const fullMetric: AnalyticsMetric = {
      ...metric,
      id: `${metric.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.metricsBuffer.push(fullMetric);

    // Real-time processing for critical metrics
    if (metric.type === MetricType.ERROR || metric.type === MetricType.PERFORMANCE) {
      await this.processRealTimeMetric(fullMetric);
    }

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flushMetrics();
    }
  }

  private async processRealTimeMetric(metric: AnalyticsMetric) {
    // Publish to Redis for real-time subscribers
    await redis.publish('analytics:realtime', JSON.stringify(metric));

    // Check for alerts
    if (metric.type === MetricType.ERROR) {
      await this.checkErrorThreshold(metric);
    } else if (metric.type === MetricType.PERFORMANCE) {
      await this.checkPerformanceThreshold(metric as any);
    }
  }

  private async checkErrorThreshold(metric: AnalyticsMetric) {
    const recentErrors = await this.getRecentMetrics(MetricType.ERROR, 300000); // Last 5 minutes
    if (recentErrors.length > 10) {
      // Trigger alert
      await redis.publish('alerts:error', JSON.stringify({
        type: 'high_error_rate',
        count: recentErrors.length,
        timeWindow: '5m',
        timestamp: new Date()
      }));
    }
  }

  private async checkPerformanceThreshold(metric: PerformanceMetric) {
    if (metric.metrics.lcp && metric.metrics.lcp > 2500) {
      await redis.publish('alerts:performance', JSON.stringify({
        type: 'poor_lcp',
        value: metric.metrics.lcp,
        page: metric.page,
        timestamp: new Date()
      }));
    }
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Store metrics in Redis with TTL
      const pipeline = redis.pipeline();

      for (const metric of metrics) {
        const key = `metrics:${metric.type}:${metric.id}`;
        pipeline.setex(key, 86400 * 7, JSON.stringify(metric)); // 7 days TTL

        // Add to sorted sets for efficient querying
        pipeline.zadd(
          `metrics:${metric.type}:timeline`,
          metric.timestamp.getTime(),
          metric.id
        );

        if (metric.userId) {
          pipeline.zadd(
            `metrics:user:${metric.userId}`,
            metric.timestamp.getTime(),
            metric.id
          );
        }
      }

      await pipeline.exec();

      // Update aggregations
      await this.updateAggregations(metrics);
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metrics);
    }
  }

  private async updateAggregations(metrics: AnalyticsMetric[]) {
    const hourlyKey = format(new Date(), 'yyyy-MM-dd-HH');
    const dailyKey = format(new Date(), 'yyyy-MM-dd');

    for (const metric of metrics) {
      // Update hourly aggregations
      await redis.hincrby(`agg:hourly:${metric.type}:${hourlyKey}`, 'count', 1);
      if (metric.measures.value) {
        await redis.hincrbyfloat(`agg:hourly:${metric.type}:${hourlyKey}`, 'sum', metric.measures.value);
      }

      // Update daily aggregations
      await redis.hincrby(`agg:daily:${metric.type}:${dailyKey}`, 'count', 1);
      if (metric.measures.value) {
        await redis.hincrbyfloat(`agg:daily:${metric.type}:${dailyKey}`, 'sum', metric.measures.value);
      }
    }
  }

  async getRecentMetrics(type: MetricType, timeWindowMs: number): Promise<AnalyticsMetric[]> {
    const now = Date.now();
    const start = now - timeWindowMs;

    const metricIds = await redis.zrangebyscore(
      `metrics:${type}:timeline`,
      start,
      now
    );

    const metrics: AnalyticsMetric[] = [];
    for (const id of metricIds) {
      const data = await redis.get(`metrics:${type}:${id}`);
      if (data) {
        metrics.push(JSON.parse(data));
      }
    }

    return metrics;
  }

  async getUserEngagementMetrics(
    userId: string,
    timeRange: TimeRange
  ): Promise<UserEngagementMetrics> {
    const start = new Date(timeRange.start).getTime();
    const end = new Date(timeRange.end).getTime();

    // Get user's metrics within time range
    const metricIds = await redis.zrangebyscore(
      `metrics:user:${userId}`,
      start,
      end
    );

    let sessions = 0;
    let totalDuration = 0;
    let pageViews = 0;
    const uniquePages = new Set<string>();
    let actions = 0;
    let documentsCreated = 0;
    let documentsEdited = 0;
    let searchQueries = 0;

    for (const id of metricIds) {
      // Get metric details from all types
      for (const type of Object.values(MetricType)) {
        const data = await redis.get(`metrics:${type}:${id}`);
        if (data) {
          const metric: AnalyticsMetric = JSON.parse(data);

          switch (metric.type) {
            case MetricType.PAGE_VIEW:
              pageViews++;
              if (metric.dimensions.page) {
                uniquePages.add(metric.dimensions.page);
              }
              break;
            case MetricType.USER_ACTION:
              actions++;
              break;
            case MetricType.CONTENT_CREATE:
              documentsCreated++;
              break;
            case MetricType.CONTENT_UPDATE:
              documentsEdited++;
              break;
            case MetricType.SEARCH:
              searchQueries++;
              break;
          }

          if (metric.measures.duration) {
            totalDuration += metric.measures.duration;
          }
        }
      }
    }

    // Calculate session metrics (simplified - in production, use proper session tracking)
    sessions = Math.ceil(metricIds.length / 10); // Rough estimate
    const averageSessionDuration = sessions > 0 ? totalDuration / sessions : 0;
    const bounceRate = pageViews > 0 ? (uniquePages.size === 1 ? 1 : 0) : 0;

    return {
      userId,
      period: new Date(timeRange.start),
      metrics: {
        sessions,
        totalDuration,
        averageSessionDuration,
        pageViews,
        uniquePages: uniquePages.size,
        actions,
        bounceRate,
        documentsCreated,
        documentsEdited,
        collaborationTime: 0, // Would need specific tracking
        searchQueries
      }
    };
  }

  async getContentMetrics(
    contentId: string,
    timeRange: TimeRange
  ): Promise<ContentMetrics> {
    const start = new Date(timeRange.start).getTime();
    const end = new Date(timeRange.end).getTime();

    // Get content-related metrics
    const viewsKey = `content:${contentId}:views`;
    const editsKey = `content:${contentId}:edits`;

    const views = await redis.zcount(viewsKey, start, end) || 0;
    const uniqueViewers = (await redis.zrange(viewsKey, start, end)).length;
    const edits = await redis.zcount(editsKey, start, end) || 0;
    const editors = (await redis.zrange(editsKey, start, end)).length;

    // Get aggregated metrics from cache
    const cachedMetrics = await redis.hgetall(`content:${contentId}:metrics`);

    return {
      contentId,
      period: new Date(timeRange.start),
      metrics: {
        views,
        uniqueViewers,
        edits,
        editors,
        averageReadTime: parseFloat(cachedMetrics.avgReadTime || '0'),
        shares: parseInt(cachedMetrics.shares || '0'),
        comments: parseInt(cachedMetrics.comments || '0'),
        reactions: parseInt(cachedMetrics.reactions || '0'),
        searchAppearances: parseInt(cachedMetrics.searchAppearances || '0'),
        searchClicks: parseInt(cachedMetrics.searchClicks || '0'),
        qualityScore: cachedMetrics.qualityScore ? parseFloat(cachedMetrics.qualityScore) : undefined
      }
    };
  }

  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // Get real-time system metrics
    const [
      activeUsers,
      apiLatencyData,
      errorCount,
      throughputData
    ] = await Promise.all([
      redis.scard('active:users'),
      redis.hgetall('system:api:latency'),
      redis.get('system:errors:count'),
      redis.get('system:throughput')
    ]);

    // Calculate percentiles from recent API calls
    const latencyValues = Object.values(apiLatencyData || {}).map(Number);
    const p50 = this.calculatePercentile(latencyValues, 50);
    const p95 = this.calculatePercentile(latencyValues, 95);
    const p99 = this.calculatePercentile(latencyValues, 99);

    return {
      timestamp: new Date(),
      metrics: {
        uptime: process.uptime(),
        cpu: process.cpuUsage().user / 1000000, // Convert to seconds
        memory: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
        activeUsers: activeUsers || 0,
        apiLatency: {
          p50,
          p95,
          p99
        },
        errorRate: parseInt(errorCount || '0') / 100, // Per 100 requests
        throughput: parseInt(throughputData || '0'),
        queueSize: 0 // Would need queue integration
      }
    };
  }

  async getAggregatedMetrics(
    type: MetricType,
    period: AggregationPeriod,
    timeRange: TimeRange
  ): Promise<AggregatedMetric[]> {
    const results: AggregatedMetric[] = [];
    const periodKey = period === AggregationPeriod.HOUR ? 'hourly' : 'daily';

    // Generate date keys based on period
    const dates = this.generateDateKeys(timeRange, period);

    for (const dateKey of dates) {
      const key = `agg:${periodKey}:${type}:${dateKey}`;
      const data = await redis.hgetall(key);

      if (data && data.count) {
        const count = parseInt(data.count);
        const sum = parseFloat(data.sum || '0');

        results.push({
          id: `${type}_${period}_${dateKey}`,
          period,
          startDate: new Date(dateKey),
          endDate: this.getEndDate(new Date(dateKey), period),
          dimensions: { type },
          metrics: {
            count,
            sum,
            avg: count > 0 ? sum / count : 0,
            min: parseFloat(data.min || '0'),
            max: parseFloat(data.max || '0'),
            percentiles: {
              p50: parseFloat(data.p50 || '0'),
              p75: parseFloat(data.p75 || '0'),
              p90: parseFloat(data.p90 || '0'),
              p95: parseFloat(data.p95 || '0'),
              p99: parseFloat(data.p99 || '0')
            }
          }
        });
      }
    }

    return results;
  }

  private generateDateKeys(timeRange: TimeRange, period: AggregationPeriod): string[] {
    const keys: string[] = [];
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);

    let current = new Date(start);
    while (current <= end) {
      if (period === AggregationPeriod.HOUR) {
        keys.push(format(current, 'yyyy-MM-dd-HH'));
        current.setHours(current.getHours() + 1);
      } else if (period === AggregationPeriod.DAY) {
        keys.push(format(current, 'yyyy-MM-dd'));
        current.setDate(current.getDate() + 1);
      } else if (period === AggregationPeriod.MONTH) {
        keys.push(format(current, 'yyyy-MM'));
        current.setMonth(current.getMonth() + 1);
      }
    }

    return keys;
  }

  private getEndDate(start: Date, period: AggregationPeriod): Date {
    const end = new Date(start);

    switch (period) {
      case AggregationPeriod.MINUTE:
        end.setMinutes(end.getMinutes() + 1);
        break;
      case AggregationPeriod.HOUR:
        end.setHours(end.getHours() + 1);
        break;
      case AggregationPeriod.DAY:
        end.setDate(end.getDate() + 1);
        break;
      case AggregationPeriod.WEEK:
        end.setDate(end.getDate() + 7);
        break;
      case AggregationPeriod.MONTH:
        end.setMonth(end.getMonth() + 1);
        break;
    }

    return end;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  async cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flushMetrics();
    await redis.quit();
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();