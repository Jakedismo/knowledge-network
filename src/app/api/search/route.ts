import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSearchService } from '@/server/modules/search/search.service'
import { performanceMonitor } from '@/server/modules/search/monitoring'
import { verifyJWT } from '@/lib/auth/jwt'

// Search query schema
const searchQuerySchema = z.object({
  query: z.string().min(0).max(500),
  workspaceId: z.string(),
  filters: z.object({
    status: z.array(z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'])).optional(),
    collections: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    authors: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional()
    }).optional()
  }).optional(),
  facets: z.array(z.enum(['status', 'collections', 'tags', 'authors'])).optional(),
  from: z.number().min(0).max(10000).default(0),
  size: z.number().min(1).max(100).default(10),
  sortBy: z.enum(['relevance', 'date_desc', 'date_asc', 'title_asc', 'title_desc']).default('relevance')
})

export async function POST(request: NextRequest) {
  const timer = performanceMonitor.startTimer('search')

  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      timer.end(false)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = await verifyJWT(token)
    if (!decoded) {
      timer.end(false)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedQuery = searchQuerySchema.parse(body)

    // TODO: Verify user has access to the workspace
    // This would check against RBAC/ACL system
    // For now, we'll assume the user has access if they're authenticated

    // Execute search
    const searchService = getSearchService()
    const results = await searchService.search(validatedQuery)

    // Record metrics
    timer.end(true, results.hits.total)

    // Add performance headers
    const response = NextResponse.json(results, {
      status: 200,
      headers: {
        'X-Search-Took': results.took.toString(),
        'X-Total-Results': results.hits.total.toString(),
        'Cache-Control': results.fromCache ? 'private, max-age=300' : 'no-cache'
      }
    })

    return response

  } catch (error) {
    timer.end(false)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

// GET endpoint for simple searches
export async function GET(request: NextRequest) {
  const timer = performanceMonitor.startTimer('search')

  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      timer.end(false)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = await verifyJWT(token)
    if (!decoded) {
      timer.end(false)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const workspaceId = searchParams.get('workspace')
    const from = parseInt(searchParams.get('from') || '0')
    const size = parseInt(searchParams.get('size') || '10')
    const sortBy = searchParams.get('sort') as any || 'relevance'

    if (!workspaceId) {
      timer.end(false)
      return NextResponse.json(
        { error: 'Workspace ID required' },
        { status: 400 }
      )
    }

    // Execute search
    const searchService = getSearchService()
    const results = await searchService.search({
      query,
      workspaceId,
      from,
      size,
      sortBy
    })

    // Record metrics
    timer.end(true, results.hits.total)

    return NextResponse.json(results, {
      status: 200,
      headers: {
        'X-Search-Took': results.took.toString(),
        'X-Total-Results': results.hits.total.toString()
      }
    })

  } catch (error) {
    timer.end(false)

    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
// @ts-nocheck
