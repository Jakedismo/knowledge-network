import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// Simple GraphQL resolver for knowledge documents
async function resolveGraphQL(query: string, variables: any = {}) {
  // Parse the query to determine what's being requested
  if (query.includes('GetKnowledgeDocuments')) {
    const documents = await prisma.knowledge.findMany({
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    return {
      data: {
        knowledgeDocuments: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          excerpt: doc.excerpt || doc.content.substring(0, 200) + '...',
          status: doc.status,
          version: doc.version,
          viewCount: doc.viewCount,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
          author: doc.author ? {
            id: doc.author.id,
            displayName: doc.author.displayName,
            email: doc.author.email,
            avatarUrl: doc.author.avatarUrl
          } : null,
          tags: doc.tags.map(kt => ({
            id: kt.tag.id,
            name: kt.tag.name,
            color: kt.tag.color
          }))
        }))
      }
    }
  }

  if (query.includes('GetRecentActivity')) {
    const activities = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true
      }
    })

    return {
      data: {
        recentActivity: activities.map(activity => ({
          id: activity.id,
          action: activity.action,
          resourceType: activity.resourceType,
          resourceId: activity.resourceId,
          user: activity.user ? {
            id: activity.user.id,
            displayName: activity.user.displayName,
            avatarUrl: activity.user.avatarUrl
          } : null,
          createdAt: activity.createdAt.toISOString()
        }))
      }
    }
  }

  if (query.includes('CreateKnowledge')) {
    const { input } = variables
    const knowledge = await prisma.knowledge.create({
      data: {
        title: input.title,
        content: input.content,
        status: input.status || 'DRAFT',
        workspaceId: input.workspaceId || 'default-workspace',
        authorId: input.authorId || 'default-user',
        excerpt: input.content.substring(0, 200)
      }
    })

    return {
      data: {
        createKnowledge: {
          id: knowledge.id,
          title: knowledge.title,
          content: knowledge.content,
          status: knowledge.status
        }
      }
    }
  }

  // Default empty response
  return { data: {} }
}

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'apollo-require-preflight',
  'apollo-client-name',
  'apollo-client-version',
]

function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin') ?? '*'
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '))
  response.headers.set('Vary', 'Origin')
  return response
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, variables, operationName } = body

    // Simple GraphQL processing
    const result = await resolveGraphQL(query, variables)

    return withCors(request, NextResponse.json(result))
  } catch (error) {
    console.error('GraphQL error:', error)
    return withCors(
      request,
      NextResponse.json(
      {
        errors: [{
          message: error instanceof Error ? error.message : 'GraphQL execution error'
        }]
      },
        { status: 500 },
      ),
    )
  }
}

export async function GET(request: NextRequest) {
  // GraphQL Playground or introspection
  return withCors(
    request,
    NextResponse.json({
      data: {
        __schema: {
          types: [],
        },
      },
    }),
  )
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '*'
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
      Vary: 'Origin',
    },
  })
}
