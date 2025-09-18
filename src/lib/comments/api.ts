import type { CommentModel, CreateCommentInput, UpdateCommentInput } from '@/types/comments'
import apolloClient from '@/lib/graphql/client'
import { CREATE_COMMENT, UPDATE_COMMENT, DELETE_COMMENT, RESOLVE_COMMENT } from '@/lib/graphql/mutations'
import { GET_COMMENTS, GET_USERS } from '@/lib/graphql/queries'

// REST fallback utilities removed now that GraphQL backend is available

export function toModel(n: any): CommentModel {
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
  const res = await apolloClient.mutate({
    mutation: CREATE_COMMENT,
    variables: { input },
    update(cache, { data }) {
      const created = data?.createComment
      if (!created) return
      const vars = { knowledgeId: input.knowledgeId }
      try {
        cache.updateQuery({ query: GET_COMMENTS, variables: vars }, (prev: any) => {
          if (!prev?.comments) return prev
          const node = created
          const edge = { node, cursor: node.id }
          const edges = [edge, ...(prev.comments.edges ?? [])]
          return { ...prev, comments: { ...prev.comments, edges, totalCount: (prev.comments.totalCount ?? 0) + 1 } }
        })
      } catch {
        // noop
      }
    },
  })
  return toModel(res.data?.createComment)
}

async function updateGraphQL(id: string, input: UpdateCommentInput): Promise<CommentModel> {
  const res = await apolloClient.mutate({
    mutation: UPDATE_COMMENT,
    variables: { id, input },
    update(cache, { data }) {
      const updated = data?.updateComment
      if (!updated) return
      // Walk edges and replace the node
      try {
        // We don't know the knowledgeId from vars; rely on existing queries in cache (best-effort)
        const ids = cache.extract()
        // no-op; update relies on normalized cache
      } catch {
        // noop
      }
    },
  })
  return toModel(res.data?.updateComment)
}

async function deleteGraphQL(id: string): Promise<void> {
  await apolloClient.mutate({
    mutation: DELETE_COMMENT,
    variables: { id },
    update(cache) {
      // naive approach: evict the entity if normalized id known
      try {
        cache.evict({ id: cache.identify({ __typename: 'Comment', id }) })
        cache.gc()
      } catch {
        // noop
      }
    },
  })
}

export const commentApi = {
  async list(knowledgeId: string): Promise<CommentModel[]> {
    return listGraphQL(knowledgeId)
  },

  async create(input: CreateCommentInput): Promise<CommentModel> {
    return createGraphQL(input)
  },

  async update(id: string, input: UpdateCommentInput): Promise<CommentModel> {
    return updateGraphQL(id, input)
  },

  async resolve(id: string): Promise<CommentModel> {
    const res = await apolloClient.mutate({ mutation: RESOLVE_COMMENT, variables: { id } })
    return toModel(res.data?.resolveComment)
  },

  async remove(id: string): Promise<void> {
    await deleteGraphQL(id)
  },

  async listReplies(_id: string): Promise<CommentModel[]> {
    // With GraphQL we fetch nested replies in list(). Keep for compatibility; not used.
    return []
  },
}

export const userSuggest = {
  async search(q: string, workspaceId?: string): Promise<{ id: string; displayName: string; avatarUrl?: string }[]> {
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
    return []
  },
}
