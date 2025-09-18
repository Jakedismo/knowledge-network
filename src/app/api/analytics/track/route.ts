import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      eventType,
      eventData,
      userId,
      resourceType,
      resourceId,
      metadata = {}
    } = body

    // Map event types to activity actions
    const actionMap: Record<string, string> = {
      'page_view': 'VIEW',
      'document_view': 'VIEW',
      'document_edit': 'UPDATE',
      'document_create': 'CREATE',
      'document_delete': 'DELETE',
      'document_share': 'SHARE',
      'comment_add': 'COMMENT',
      'collaborate': 'COLLABORATE'
    }

    const action = actionMap[eventType] || eventType.toUpperCase()

    // Create activity log entry
    const activity = await prisma.activityLog.create({
      data: {
        action: action as any,
        resourceType: resourceType || eventType,
        resourceId: resourceId || null,
        metadata: JSON.stringify({ ...metadata, ...eventData }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
        userId: userId || null
      }
    })

    // If it's a search event, also log to search queries
    if (eventType === 'search' && eventData?.query) {
      await prisma.searchQuery.create({
        data: {
          query: eventData.query,
          filters: JSON.stringify(eventData.filters || {}),
          resultCount: eventData.resultCount || 0,
          responseTime: eventData.responseTime || 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      activityId: activity.id
    })
  } catch (error) {
    console.error('Analytics track error:', error)
    return NextResponse.json(
      { error: 'Failed to track analytics event' },
      { status: 500 }
    )
  }
}