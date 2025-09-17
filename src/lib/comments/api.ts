import type { CommentModel, CreateCommentInput, UpdateCommentInput } from '@/types/comments'
import apolloClient from '@/lib/graphql/client'
import { CREATE_COMMENT, UPDATE_COMMENT, DELETE_COMMENT, RESOLVE_COMMENT } from '@/lib/graphql/mutations'
import { GET_COMMENTS, GET_USERS } from '@/lib/graphql/queries'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

function toModel(n: any): CommentModel {
  return {
    id: n.id,
    knowledgeId: n.knowledgeId,
    parentId: n.parentId ?? null,
    authorId: n.authorId,
    content: n.content,
    mentions: (n.mentions ?? []) as any,
    positionData: (n.positionData ?? null) as any,
    status: n.status,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    replies: Array.isArray(n.replies) ? n.replies.map(toModel) : [],
  }
}

async function listGraphQL(knowledgeId: string): Promise<CommentModel[]> {
  const res = await apolloClient.query({ query: GET_COMMENTS, variables: { knowledgeId }, fetchPolicy: 'network-only' })
  const edges = res.data?.comments?.edges ?? []
  return edges.map((e: any) => toModel(e.node))
}

async function createGraphQL(input: CreateCommentInput): Promise<CommentModel> {
  const res = await apolloClient.mutate({ mutation: CREATE_COMMENT, variables: { input } })
  return toModel(res.data?.createComment)
}

async function updateGraphQL(id: string, input: UpdateCommentInput): Promise<CommentModel> {
  const res = await apolloClient.mutate({ mutation: UPDATE_COMMENT, variables: { id, input } })
  return toModel(res.data?.updateComment)
}

async function deleteGraphQL(id: string): Promise<void> {
  await apolloClient.mutate({ mutation: DELETE_COMMENT, variables: { id } })
}

export const commentApi = {
  async list(knowledgeId: string, init?: RequestInit): Promise<CommentModel[]> {
    try {
      return await listGraphQL(knowledgeId)
    } catch {
      // Fallback to REST mock if GraphQL is unavailable locally
      const res = await fetch(`/api/comments?knowledgeId=${encodeURIComponent(knowledgeId)}`, {
        method: 'GET',
        headers: { 'content-type': 'application/json', 'x-user-id': 'demo-user', ...(init?.headers ?? {}) },
        ...init,
      })
      const { data } = await json<{ data: CommentModel[] }>(res)
      return data
    }
  },

  async create(input: CreateCommentInput, init?: RequestInit): Promise<CommentModel> {
    try {
      return await createGraphQL(input)
    } catch {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'demo-user', ...(init?.headers ?? {}) },
        body: JSON.stringify(input),
        ...init,
      })
      const { data } = await json<{ data: CommentModel }>(res)
      return data
    }
  },

  async update(id: string, input: UpdateCommentInput, init?: RequestInit): Promise<CommentModel> {
    try {
      return await updateGraphQL(id, input)
    } catch {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-user-id': 'demo-user', ...(init?.headers ?? {}) },
        body: JSON.stringify(input),
        ...init,
      })
      const { data } = await json<{ data: CommentModel }>(res)
      return data
    }
  },

  async resolve(id: string): Promise<CommentModel> {
    const res = await apolloClient.mutate({ mutation: RESOLVE_COMMENT, variables: { id } })
    return toModel(res.data?.resolveComment)
  },

  async remove(id: string, init?: RequestInit): Promise<void> {
    try {
      await deleteGraphQL(id)
    } catch {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE', headers: { 'x-user-id': 'demo-user', ...(init?.headers ?? {}) }, ...(init ?? {}) })
      await json<{ ok: boolean }>(res)
    }
  },

  async listReplies(_id: string, _init?: RequestInit): Promise<CommentModel[]> {
    // With GraphQL we fetch nested replies in list(). Keep for compatibility; not used.
    return []
  },
}

export const userSuggest = {
  async search(q: string, workspaceId?: string, init?: RequestInit): Promise<{ id: string; displayName: string; avatarUrl?: string }[]> {
    // Prefer GraphQL if workspaceId is available
    if (workspaceId) {
      try {
        const res = await apolloClient.query({ query: GET_USERS, variables: { workspaceId }, fetchPolicy: 'cache-first' })
        const users = (res.data?.users ?? []) as { id: string; displayName: string; avatarUrl?: string }[]
        const needle = q.trim().toLowerCase()
        return users.filter((u) => u.displayName.toLowerCase().includes(needle)).slice(0, 8)
      } catch {
        // fall through to REST mock
      }
    }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { method: 'GET', headers: { 'x-user-id': 'demo-user', ...(init?.headers ?? {}) }, ...(init ?? {}) })
    const { data } = await json<{ data: { id: string; displayName: string; avatarUrl?: string }[] }>(res)
    return data
  },
}
