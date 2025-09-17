import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSearchService } from '@/server/modules/search/search.service'
import { performanceMonitor } from '@/server/modules/search/monitoring'
import { verifyJWT } from '@/lib/auth/jwt'

// Suggest query schema
const suggestQuerySchema = z.object({
  query: z.string().min(1).max(50),
  workspaceId: z.string(),
  size: z.number().min(1).max(20).default(10)
})

export async function GET(request: NextRequest) {
  const timer = performanceMonitor.startTimer('suggest')

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
    const size = parseInt(searchParams.get('size') || '10')

    if (!workspaceId) {
      timer.end(false)
      return NextResponse.json(
        { error: 'Workspace ID required' },
        { status: 400 }
      )
    }

    if (!query) {
      timer.end(false)
      return NextResponse.json(
        { error: 'Query required' },
        { status: 400 }
      )
    }

    // Execute suggest
    const searchService = getSearchService()
    const results = await searchService.suggest({
      query,
      workspaceId,
      size
    })

    // Record metrics
    timer.end(true, results.suggestions.length)

    // Cache aggressively for suggestions
    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-Suggestion-Count': results.suggestions.length.toString()
      }
    })

  } catch (error) {
    timer.end(false)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid suggest parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Suggest error:', error)
    return NextResponse.json(
      { error: 'Suggest failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const timer = performanceMonitor.startTimer('suggest')

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
    const validatedQuery = suggestQuerySchema.parse(body)

    // Execute suggest
    const searchService = getSearchService()
    const results = await searchService.suggest(validatedQuery)

    // Record metrics
    timer.end(true, results.suggestions.length)

    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-Suggestion-Count': results.suggestions.length.toString()
      }
    })

  } catch (error) {
    timer.end(false)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid suggest parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Suggest error:', error)
    return NextResponse.json(
      { error: 'Suggest failed' },
      { status: 500 }
    )
  }
}