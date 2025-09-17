import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/server/modules/search/monitoring'
import { verifyJWT } from '@/lib/auth/jwt'
import { getElasticClient } from '@/server/modules/search/elastic/client'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = await verifyJWT(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user has admin role (simplified check)
    // TODO: Integrate with RBAC system
    const isAdmin = decoded.role === 'ADMIN' || decoded.role === 'SUPER_ADMIN'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get format parameter
    const format = request.nextUrl.searchParams.get('format')

    if (format === 'prometheus') {
      // Return Prometheus format metrics
      const metrics = performanceMonitor.getPrometheusMetrics()
      return new NextResponse(metrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4'
        }
      })
    }

    // Get cluster health
    const client = getElasticClient()
    const clusterHealth = await client.cluster.health()
    const clusterStats = await client.cluster.stats()

    // Get current metrics from monitor
    const searchMetrics = performanceMonitor.calculateMetrics()

    // Combine all metrics
    const response = {
      timestamp: new Date().toISOString(),
      search: {
        latency: {
          p50: searchMetrics.searchLatencyP50,
          p95: searchMetrics.searchLatencyP95,
          p99: searchMetrics.searchLatencyP99,
          unit: 'ms'
        },
        throughput: {
          qps: searchMetrics.searchQPS,
          unit: 'queries/second'
        },
        errors: {
          rate: searchMetrics.searchErrorRate,
          unit: 'percentage'
        }
      },
      indexing: {
        latency: {
          p50: searchMetrics.indexLatencyP50,
          p95: searchMetrics.indexLatencyP95,
          p99: searchMetrics.indexLatencyP99,
          unit: 'ms'
        },
        throughput: {
          dps: searchMetrics.indexDPS,
          unit: 'documents/second'
        },
        errors: {
          rate: searchMetrics.indexErrorRate,
          bulkRejectionRate: searchMetrics.bulkRejectionRate,
          unit: 'percentage'
        }
      },
      cache: {
        hitRatio: searchMetrics.cacheHitRatio,
        hits: searchMetrics.cacheHitCount,
        misses: searchMetrics.cacheMissCount
      },
      business: {
        uniqueSearches: searchMetrics.uniqueSearchesPerMinute,
        zeroResultRate: searchMetrics.zeroResultRate,
        averageResults: searchMetrics.averageResultCount
      },
      cluster: {
        status: clusterHealth.status,
        nodes: clusterHealth.number_of_nodes,
        activeShards: clusterHealth.active_shards,
        unassignedShards: clusterHealth.unassigned_shards,
        activePrimaryShards: clusterHealth.active_primary_shards,
        indices: {
          count: clusterStats.indices?.count || 0,
          docs: clusterStats.indices?.docs?.count || 0,
          store: {
            sizeInBytes: clusterStats.indices?.store?.size_in_bytes || 0,
            sizeReadable: formatBytes(clusterStats.indices?.store?.size_in_bytes || 0)
          }
        }
      },
      performanceStatus: {
        meetsLatencyRequirement: searchMetrics.searchLatencyP99 < 500,
        meetsQPSRequirement: searchMetrics.searchQPS > 10,
        overall: searchMetrics.searchLatencyP99 < 500 && searchMetrics.searchQPS > 10 ? 'HEALTHY' : 'DEGRADED'
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    )
  }
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
}