import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '7d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()

    switch(timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24)
        break
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate.setDate(startDate.getDate() - 7)
    }

    // Get analytics metrics from database
    const [
      totalDocuments,
      activeUsers,
      searchQueries,
      recentActivity,
      topSearches
    ] = await Promise.all([
      // Count total documents
      prisma.knowledge.count(),

      // Count active users (users who have activity in the time range)
      prisma.activityLog.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        select: {
          userId: true
        },
        distinct: ['userId']
      }),

      // Count search queries
      prisma.searchQuery.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),

      // Get recent activity
      prisma.activityLog.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: true
        }
      }),

      // Get top searches
      prisma.searchQuery.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    // Calculate chart data for the time period
    const chartData = []
    const dayInMs = 24 * 60 * 60 * 1000
    const dataPoints = timeRange === '24h' ? 24 : (timeRange === '7d' ? 7 : 30)

    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * dayInMs))
      const nextDate = new Date(date.getTime() + dayInMs)

      const [views, edits, shares] = await Promise.all([
        prisma.activityLog.count({
          where: {
            action: 'VIEW',
            createdAt: {
              gte: date,
              lt: nextDate
            }
          }
        }),
        prisma.activityLog.count({
          where: {
            action: 'UPDATE',
            createdAt: {
              gte: date,
              lt: nextDate
            }
          }
        }),
        prisma.activityLog.count({
          where: {
            action: 'SHARE',
            createdAt: {
              gte: date,
              lt: nextDate
            }
          }
        })
      ])

      chartData.push({
        date: date.toISOString().split('T')[0],
        views,
        edits,
        shares
      })
    }

    const dashboardData = {
      stats: {
        totalDocuments,
        activeUsers: activeUsers.length,
        totalSearches: searchQueries,
        avgResponseTime: Math.floor(Math.random() * 100) + 50, // Mock response time
      },
      chartData,
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: activity.action,
        resourceType: activity.resourceType,
        resourceId: activity.resourceId,
        user: activity.user?.displayName || 'Anonymous',
        timestamp: activity.createdAt
      })),
      topSearches: topSearches.map(search => ({
        query: search.query,
        count: search.resultCount,
        avgTime: search.responseTime
      })),
      systemHealth: {
        status: 'healthy',
        uptime: 99.9,
        responseTime: 45,
        errorRate: 0.1
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}