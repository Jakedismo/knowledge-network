import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

type KnowledgeRecord = Awaited<ReturnType<typeof buildKnowledgeResponse>>

function toISO(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString()
  if (typeof date === 'string') return new Date(date).toISOString()
  return date.toISOString?.() ?? new Date().toISOString()
}

function mapAuthor(user: any) {
  if (!user) return null
  return {
    id: user.id,
    displayName: user.displayName ?? 'User',
    avatarUrl: user.avatarUrl ?? null,
  }
}

function mapCommentNode(comment: any) {
  return {
    id: comment.id,
    content: comment.content ?? '',
    positionData: comment.positionData,
    status: comment.status ?? 'OPEN',
    createdAt: toISO(comment.createdAt),
    updatedAt: toISO(comment.updatedAt),
    knowledgeId: comment.knowledgeId,
    authorId: comment.authorId,
    parentId: comment.parentId ?? null,
    author: mapAuthor(comment.author),
    replies:
      Array.isArray(comment.replies)
        ? comment.replies.map((reply: any) => ({
            id: reply.id,
            content: reply.content ?? '',
            status: reply.status ?? 'OPEN',
            createdAt: toISO(reply.createdAt),
            updatedAt: toISO(reply.updatedAt),
            knowledgeId: reply.knowledgeId,
            authorId: reply.authorId,
            parentId: reply.parentId ?? comment.id,
            author: mapAuthor(reply.author),
          }))
        : [],
  }
}

function mapCommentEdge(comment: any) {
  return {
    node: mapCommentNode(comment),
    cursor: comment.id,
  }
}

function emptyCommentsConnection() {
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      endCursor: null,
    },
    totalCount: 0,
  }
}

async function buildKnowledgeResponse(id: string) {
  try {
    const doc = await prisma.knowledge.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        collection: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: {
                  select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        collaborationPresences: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        sourceLinks: {
          include: {
            target: {
              select: {
                id: true,
                title: true,
                excerpt: true,
                author: {
                  select: {
                    id: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        targetLinks: {
          include: {
            source: {
              select: {
                id: true,
                title: true,
                excerpt: true,
                author: {
                  select: {
                    id: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (doc) {
      const estimatedReadTime = doc.content
        ? Math.max(1, Math.ceil(doc.content.split(/\s+/).filter(Boolean).length / 200))
        : 0
      return {
        id: doc.id,
        title: doc.title ?? 'Untitled document',
        content: doc.content ?? '',
        contentDelta: doc.contentDelta,
        excerpt: doc.excerpt ?? '',
        status: doc.status ?? 'DRAFT',
        version: doc.version ?? '1.0',
        isTemplate: Boolean(doc.isTemplate),
        templateId: doc.templateId,
        metadata: doc.metadata ?? {},
        viewCount: doc.viewCount ?? 0,
        createdAt: toISO(doc.createdAt),
        updatedAt: toISO(doc.updatedAt),
        readTime: estimatedReadTime,
        author: doc.author
          ? {
              id: doc.author.id,
              displayName: doc.author.displayName ?? 'Unknown author',
              avatarUrl: doc.author.avatarUrl ?? null,
            }
          : null,
        workspace: doc.workspace
          ? {
              id: doc.workspace.id,
              name: doc.workspace.name ?? 'Workspace',
            }
          : null,
        collection: doc.collection
          ? {
              id: doc.collection.id,
              name: doc.collection.name ?? 'Collection',
              color: doc.collection.color,
            }
          : null,
        tags: doc.tags?.map((t) => ({
          tag: {
            id: t.tag.id,
            name: t.tag.name ?? 'Tag',
            color: t.tag.color,
          },
        })) ?? [],
        comments: doc.comments?.length
          ? {
              edges: doc.comments.map(mapCommentEdge),
              pageInfo: {
                hasNextPage: false,
                endCursor: doc.comments.at(-1)?.id ?? null,
              },
              totalCount: doc.comments.length,
            }
          : emptyCommentsConnection(),
        collaborators: (() => {
          const collaboratorUsers = (doc.collaborationPresences ?? [])
            .map((presence) => presence.user)
            .filter((user): user is NonNullable<typeof user> => Boolean(user))
          return collaboratorUsers.map((user) => ({
            id: user.id,
            displayName: user.displayName ?? 'User',
            avatarUrl: user.avatarUrl ?? null,
          }))
        })(),
        relatedKnowledge: (() => {
          const relatedDocs = [
            ...(doc.sourceLinks?.map((link) => link.target).filter(Boolean) ?? []),
            ...(doc.targetLinks?.map((link) => link.source).filter(Boolean) ?? []),
          ]
          return relatedDocs.map((related) => ({
            id: related.id,
            title: related.title ?? 'Related document',
            excerpt: related.excerpt ?? '',
            author: related.author
              ? {
                  id: related.author.id,
                  displayName: related.author.displayName ?? 'Unknown author',
                }
              : null,
          }))
        })(),
      }
    }
  } catch (error) {
    logger.warn('Knowledge lookup failed', error)
  }

  return {
    id,
    title: 'Untitled document',
    content: '',
    contentDelta: null,
    excerpt: '',
    status: 'DRAFT',
    version: '1.0',
    isTemplate: false,
    templateId: null,
    metadata: {},
    viewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readTime: 0,
    author: null,
    workspace: null,
    collection: null,
    tags: [],
    comments: emptyCommentsConnection(),
    collaborators: [],
    relatedKnowledge: [],
  }
}

async function buildWorkspaceResponse(id: string | undefined) {
  if (!id) return null
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        tags: true,
        collections: {
          where: { parentId: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { knowledge: true } },
            children: {
              orderBy: { sortOrder: 'asc' },
              include: {
                _count: { select: { knowledge: true } },
                children: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    _count: { select: { knowledge: true } },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            knowledge: true,
            userRoles: true,
          },
        },
      },
    })

    if (!workspace) return null

    const mapCollection = (collection: any): any => ({
      id: collection.id,
      name: collection.name ?? 'Collection',
      description: collection.description,
      color: collection.color,
      icon: collection.icon,
      knowledgeCount: collection._count?.knowledge ?? 0,
      children: Array.isArray(collection.children) ? collection.children.map(mapCollection) : [],
    })

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      settings: workspace.settings ?? {},
      isActive: workspace.isActive,
      createdAt: toISO(workspace.createdAt),
      updatedAt: toISO(workspace.updatedAt),
      memberCount: workspace._count?.userRoles ?? 0,
      knowledgeCount: workspace._count?.knowledge ?? 0,
      collections: Array.isArray(workspace.collections)
        ? workspace.collections.map(mapCollection)
        : [],
      tags: Array.isArray(workspace.tags)
        ? workspace.tags.map((tag: any) => ({
            id: tag.id,
            name: tag.name ?? 'Tag',
            color: tag.color,
            usageCount: tag.usageCount ?? 0,
          }))
        : [],
    }
  } catch (error) {
    logger.warn('Workspace lookup failed', error)
    return null
  }
}

async function buildActiveCollaboratorsResponse(knowledgeId: string | undefined) {
  if (!knowledgeId) return []
  try {
    const sessions = await prisma.collaborationSession.findMany({
      where: { knowledgeId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { lastSeen: 'desc' },
      take: 16,
    })

    return sessions
      .map((session) => ({
        id: session.id,
        socketId: session.socketId,
        isActive: session.isActive,
        lastSeen: session.lastSeen?.toISOString?.() ?? new Date().toISOString(),
        cursorPos: session.cursorPos ?? null,
        selection: session.selection ?? null,
        createdAt: toISO(session.createdAt),
        userId: session.userId,
        knowledgeId: session.knowledgeId,
        user: session.user
          ? {
              id: session.user.id,
              displayName: session.user.displayName ?? 'Collaborator',
              avatarUrl: session.user.avatarUrl,
            }
          : null,
      }))
      .filter((session) => Boolean(session.user))
  } catch (error) {
    logger.warn('Active collaborator lookup failed', error)
    return []
  }
}

async function buildCommentsConnection(knowledgeId: string | undefined) {
  if (!knowledgeId) return emptyCommentsConnection()
  try {
    const comments = await prisma.comment.findMany({
      where: { knowledgeId, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    })

    if (!comments.length) return emptyCommentsConnection()

    return {
      edges: comments.map(mapCommentEdge),
      pageInfo: {
        hasNextPage: false,
        endCursor: comments.at(-1)?.id ?? null,
      },
      totalCount: comments.length,
    }
  } catch (error) {
    logger.warn('Comments lookup failed', error)
    return emptyCommentsConnection()
  }
}

function extractOperationName(query: string): string | null {
  const match = /(query|mutation|subscription)\s+([A-Za-z0-9_]+)/.exec(query)
  return match && typeof match[2] === 'string' ? match[2] : null
}

function resolveOperationName(query: string, explicit?: string | null): string | null {
  if (explicit && explicit.trim().length > 0) return explicit
  const extracted = extractOperationName(query)
  if (extracted) return extracted
  if (query.includes('GetKnowledgeDocuments')) return 'GetKnowledgeDocuments'
  if (query.includes('GetKnowledge')) return 'GetKnowledge'
  if (query.includes('GetWorkspace')) return 'GetWorkspace'
  if (query.includes('GetRecentActivity')) return 'GetRecentActivity'
  if (query.includes('CreateKnowledge')) return 'CreateKnowledge'
  if (query.includes('GetActiveCollaborators')) return 'GetActiveCollaborators'
  if (query.includes('GetComments')) return 'GetComments'
  return null
}

// Simple GraphQL resolver for knowledge documents
async function resolveGraphQL(query: string, variables: any = {}, operationName?: string) {
  if (/subscription\s+/i.test(query)) {
    if (query.includes('commentAdded')) {
      return { data: { commentAdded: null } }
    }
    return { data: {} }
  }

  const opName = resolveOperationName(query, operationName)

  switch (opName) {
    case 'GetKnowledgeDocuments': {
      try {
        const documents = await prisma.knowledge.findMany({
          take: 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
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
            author: doc.author
              ? {
                  id: doc.author.id,
                  displayName: doc.author.displayName,
                  email: doc.author.email,
                  avatarUrl: doc.author.avatarUrl,
                }
              : null,
            tags: doc.tags.map(kt => ({
              id: kt.tag.id,
              name: kt.tag.name,
              color: kt.tag.color,
            })),
          })),
        },
      }
    } catch (error) {
      logger.warn('Knowledge documents lookup failed', error)
      return {
        data: {
          knowledgeDocuments: [],
        },
      }
    }
    }
    case 'GetKnowledge': {
      const knowledge = await buildKnowledgeResponse(variables?.id || 'demo-knowledge')
      return {
        data: {
          knowledge,
        },
      }
    }
    case 'GetWorkspace': {
      const workspace = await buildWorkspaceResponse(variables?.id)
      return {
        data: {
          workspace,
        },
      }
    }
    case 'GetRecentActivity': {
      try {
        const activities = await prisma.activityLog.findMany({
          take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
        },
      })

      return {
        data: {
          recentActivity: activities.map(activity => ({
            id: activity.id,
            action: activity.action,
            resourceType: activity.resourceType,
            resourceId: activity.resourceId,
            user: activity.user
              ? {
                  id: activity.user.id,
                  displayName: activity.user.displayName,
                  avatarUrl: activity.user.avatarUrl,
                }
              : null,
            createdAt: activity.createdAt.toISOString(),
          })),
        },
      }
    } catch (error) {
      logger.warn('Recent activity lookup failed', error)
      return {
        data: {
          recentActivity: [],
        },
      }
    }
    }
    case 'CreateKnowledge': {
      const { input } = variables
      const knowledge = await prisma.knowledge.create({
        data: {
          title: input.title,
          content: input.content,
          status: input.status || 'DRAFT',
          workspaceId: input.workspaceId || 'default-workspace',
          authorId: input.authorId || 'default-user',
          excerpt: input.content.substring(0, 200),
        },
      })

      return {
        data: {
          createKnowledge: {
            id: knowledge.id,
            title: knowledge.title,
            content: knowledge.content,
            status: knowledge.status,
          },
        },
      }
    }
    case 'GetActiveCollaborators': {
      const sessions = await buildActiveCollaboratorsResponse(variables?.knowledgeId)
      return {
        data: {
          activeCollaborators: sessions,
        },
      }
    }
    case 'GetComments': {
      const comments = await buildCommentsConnection(variables?.knowledgeId)
      return {
        data: {
          comments,
        },
      }
    }
    default: {
      logger.debug?.('Unhandled GraphQL operation', { operationName: opName })
      return { data: {} }
    }
  }
}

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'apollo-require-preflight',
  'Apollo-Require-Preflight',
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
  let rawBody = ''
  try {
    rawBody = await request.text()
  } catch (error) {
    logger.error('Failed to read GraphQL request body', error)
    return withCors(
      request,
      NextResponse.json(
        {
          errors: [
            {
              message: 'Unable to read request body',
            },
          ],
          data: null,
        },
        { status: 400 },
      ),
    )
  }

  if (!rawBody || !rawBody.trim()) {
    return withCors(
      request,
      NextResponse.json(
        {
          errors: [
            {
              message: 'Missing request body. Provide a GraphQL query payload.',
            },
          ],
          data: null,
        },
        { status: 400 },
      ),
    )
  }

  let body: { query?: string; variables?: any; operationName?: string } | null = null
  try {
    body = JSON.parse(rawBody)
  } catch (error) {
    logger.warn('Invalid GraphQL JSON payload', error)
    return withCors(
      request,
      NextResponse.json(
        {
          errors: [
            {
              message: 'Invalid JSON body in GraphQL request.',
            },
          ],
          data: null,
        },
        { status: 400 },
      ),
    )
  }

  const { query, variables, operationName } = body ?? {}
  if (!query || typeof query !== 'string' || !query.trim()) {
    return withCors(
      request,
      NextResponse.json(
        {
          errors: [
            {
              message: 'A GraphQL "query" string is required.',
            },
          ],
          data: null,
        },
        { status: 400 },
      ),
    )
  }

  try {
    const result = await resolveGraphQL(query, variables, operationName)
    return withCors(request, NextResponse.json(result))
  } catch (error) {
    logger.error('GraphQL execution error', error)
    return withCors(
      request,
      NextResponse.json(
        {
          errors: [
            {
              message: error instanceof Error ? error.message : 'GraphQL execution error',
            },
          ],
          data: null,
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
