import { EventEmitter } from 'events'

export interface SearchMetrics {
  // Latency metrics (in ms)
  searchLatencyP50: number
  searchLatencyP95: number
  searchLatencyP99: number
  indexLatencyP50: number
  indexLatencyP95: number
  indexLatencyP99: number

  // Throughput metrics
  searchQPS: number
  indexDPS: number

  // Cache metrics
  cacheHitRatio: number
  cacheMissCount: number
  cacheHitCount: number

  // Error metrics
  searchErrorRate: number
  indexErrorRate: number
  bulkRejectionRate: number

  // Business metrics
  uniqueSearchesPerMinute: number
  zeroResultRate: number
  averageResultCount: number

  // Cluster health
  heapUsagePercent: number
  cpuUsagePercent: number
  activeShards: number
  unassignedShards: number
}

export interface PerformanceRecord {
  operation: 'search' | 'index' | 'suggest' | 'bulk'
  duration: number
  success: boolean
  workspaceId?: string
  resultCount?: number
  timestamp: number
}

class PerformanceMonitor extends EventEmitter {
  private records: PerformanceRecord[] = []
  private windowSize = 60000 // 1 minute window
  private metricsInterval: NodeJS.Timeout | null = null
  private latencyBuckets = {
    search: [] as number[],
    index: [] as number[]
  }

  constructor() {
    super()
    this.startMetricsCollection()
  }

  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      const metrics = this.calculateMetrics()
      this.emit('metrics', metrics)
      this.logMetrics(metrics)
      this.cleanOldRecords()
    }, 10000) // Calculate every 10 seconds
  }

  record(record: PerformanceRecord): void {
    this.records.push(record)

    // Add to latency buckets for percentile calculations
    if (record.success) {
      if (record.operation === 'search') {
        this.latencyBuckets.search.push(record.duration)
        if (this.latencyBuckets.search.length > 1000) {
          this.latencyBuckets.search.shift()
        }
      } else if (record.operation === 'index') {
        this.latencyBuckets.index.push(record.duration)
        if (this.latencyBuckets.index.length > 1000) {
          this.latencyBuckets.index.shift()
        }
      }
    }

    // Alert on slow operations
    if (record.operation === 'search' && record.duration > 500) {
      this.emit('alert', {
        type: 'slow_search',
        message: `Search took ${record.duration}ms (threshold: 500ms)`,
        workspace: record.workspaceId,
        timestamp: record.timestamp
      })
    }

    if (record.operation === 'index' && record.duration > 100) {
      this.emit('alert', {
        type: 'slow_index',
        message: `Index operation took ${record.duration}ms (threshold: 100ms)`,
        workspace: record.workspaceId,
        timestamp: record.timestamp
      })
    }
  }

  private calculateMetrics(): SearchMetrics {
    const now = Date.now()
    const recentRecords = this.records.filter(r => r.timestamp > now - this.windowSize)

    // Search metrics
    const searchRecords = recentRecords.filter(r => r.operation === 'search')
    const searchLatencies = searchRecords.filter(r => r.success).map(r => r.duration)
    const searchErrors = searchRecords.filter(r => !r.success).length

    // Index metrics
    const indexRecords = recentRecords.filter(r => r.operation === 'index')
    const indexLatencies = indexRecords.filter(r => r.success).map(r => r.duration)
    const indexErrors = indexRecords.filter(r => !r.success).length

    // Bulk metrics
    const bulkRecords = recentRecords.filter(r => r.operation === 'bulk')
    const bulkRejections = bulkRecords.filter(r => !r.success).length

    // Business metrics
    const uniqueSearchWorkspaces = new Set(searchRecords.map(r => r.workspaceId)).size
    const zeroResults = searchRecords.filter(r => r.resultCount === 0).length
    const totalResults = searchRecords.reduce((sum, r) => sum + (r.resultCount || 0), 0)

    // Calculate cache metrics (would be populated by cache service)
    const cacheHits = this.getCacheMetrics().hits
    const cacheMisses = this.getCacheMetrics().misses

    return {
      // Latency percentiles
      searchLatencyP50: this.calculatePercentile(searchLatencies, 50),
      searchLatencyP95: this.calculatePercentile(searchLatencies, 95),
      searchLatencyP99: this.calculatePercentile(searchLatencies, 99),
      indexLatencyP50: this.calculatePercentile(indexLatencies, 50),
      indexLatencyP95: this.calculatePercentile(indexLatencies, 95),
      indexLatencyP99: this.calculatePercentile(indexLatencies, 99),

      // Throughput
      searchQPS: searchRecords.length / (this.windowSize / 1000),
      indexDPS: indexRecords.length / (this.windowSize / 1000),

      // Cache
      cacheHitRatio: cacheHits / (cacheHits + cacheMisses) || 0,
      cacheHitCount: cacheHits,
      cacheMissCount: cacheMisses,

      // Errors
      searchErrorRate: searchErrors / Math.max(searchRecords.length, 1),
      indexErrorRate: indexErrors / Math.max(indexRecords.length, 1),
      bulkRejectionRate: bulkRejections / Math.max(bulkRecords.length, 1),

      // Business
      uniqueSearchesPerMinute: uniqueSearchWorkspaces,
      zeroResultRate: zeroResults / Math.max(searchRecords.length, 1),
      averageResultCount: totalResults / Math.max(searchRecords.length, 1),

      // Cluster health (would be populated by cluster monitoring)
      heapUsagePercent: this.getClusterHealth().heapUsage,
      cpuUsagePercent: this.getClusterHealth().cpuUsage,
      activeShards: this.getClusterHealth().activeShards,
      unassignedShards: this.getClusterHealth().unassignedShards
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0

    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  private cleanOldRecords(): void {
    const cutoff = Date.now() - this.windowSize * 5 // Keep 5 windows of data
    this.records = this.records.filter(r => r.timestamp > cutoff)
  }

  private logMetrics(metrics: SearchMetrics): void {
    // Log critical metrics
    if (metrics.searchLatencyP99 > 500) {
      console.warn(`⚠️ High search latency: P99=${metrics.searchLatencyP99}ms`)
    }
    if (metrics.searchErrorRate > 0.05) {
      console.error(`❌ High search error rate: ${(metrics.searchErrorRate * 100).toFixed(2)}%`)
    }
    if (metrics.cacheHitRatio < 0.5) {
      console.info(`ℹ️ Low cache hit ratio: ${(metrics.cacheHitRatio * 100).toFixed(2)}%`)
    }

    // Log summary every minute
    if (Math.random() < 0.1) { // Sample 10% to avoid log spam
      console.log('📊 Search Performance Metrics:', {
        searchQPS: metrics.searchQPS.toFixed(2),
        searchP50: `${metrics.searchLatencyP50}ms`,
        searchP99: `${metrics.searchLatencyP99}ms`,
        cacheHitRatio: `${(metrics.cacheHitRatio * 100).toFixed(2)}%`,
        errorRate: `${(metrics.searchErrorRate * 100).toFixed(2)}%`
      })
    }
  }

  // Placeholder for cache metrics (would be implemented by cache service)
  private getCacheMetrics(): { hits: number; misses: number } {
    // This would be populated by the actual cache service
    return {
      hits: this.records.filter(r => r.operation === 'search' && r.duration < 10).length,
      misses: this.records.filter(r => r.operation === 'search' && r.duration >= 10).length
    }
  }

  // Placeholder for cluster health (would be implemented by cluster monitor)
  private getClusterHealth() {
    // This would be populated by actual cluster monitoring
    return {
      heapUsage: 45,
      cpuUsage: 30,
      activeShards: 12,
      unassignedShards: 0
    }
  }

  // Create a performance timer
  startTimer(operation: 'search' | 'index' | 'suggest' | 'bulk', workspaceId?: string) {
    const start = Date.now()
    return {
      end: (success: boolean, resultCount?: number) => {
        this.record({
          operation,
          duration: Date.now() - start,
          success,
          workspaceId,
          resultCount,
          timestamp: Date.now()
        })
      }
    }
  }

  // Export metrics for external monitoring (Prometheus format)
  getPrometheusMetrics(): string {
    const metrics = this.calculateMetrics()
    return `
# HELP search_latency_seconds Search operation latency in seconds
# TYPE search_latency_seconds summary
search_latency_seconds{quantile="0.5"} ${metrics.searchLatencyP50 / 1000}
search_latency_seconds{quantile="0.95"} ${metrics.searchLatencyP95 / 1000}
search_latency_seconds{quantile="0.99"} ${metrics.searchLatencyP99 / 1000}

# HELP search_qps Searches per second
# TYPE search_qps gauge
search_qps ${metrics.searchQPS}

# HELP cache_hit_ratio Cache hit ratio
# TYPE cache_hit_ratio gauge
cache_hit_ratio ${metrics.cacheHitRatio}

# HELP search_error_rate Search error rate
# TYPE search_error_rate gauge
search_error_rate ${metrics.searchErrorRate}
    `.trim()
  }

  shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Graceful shutdown
process.on('SIGINT', () => performanceMonitor.shutdown())
process.on('SIGTERM', () => performanceMonitor.shutdown())