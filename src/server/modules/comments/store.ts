import type { CommentModel, CommentStatus } from '@/types/comments'

// Simple in-memory store for comments during Phase 3B UI/dev.
// Replace with real persistence in Phase 6 or when GraphQL backend lands.

const comments = new Map<string, CommentModel>()

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const commentStore = {
  listByKnowledge(knowledgeId: string) {
    const list = Array.from(comments.values()).filter((c) => c.knowledgeId === knowledgeId && !c.parentId)
    // nest replies
    return list
      .map((root) => ({ ...root, replies: this.listReplies(root.id) }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  listReplies(parentId: string) {
    return Array.from(comments.values())
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  get(id: string) {
    return comments.get(id) ?? null
  },

  create(input: Omit<CommentModel, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: CommentStatus }) {
    const id = uid()
    const now = new Date().toISOString()
    const model: CommentModel = {
      id,
      status: input.status ?? 'open',
      createdAt: now,
      updatedAt: now,
      ...input,
    }
    comments.set(id, model)
    return model
  },

  update(id: string, patch: Partial<Pick<CommentModel, 'content' | 'status'>>) {
    const prev = comments.get(id)
    if (!prev) return null
    const next: CommentModel = { ...prev, ...patch, updatedAt: new Date().toISOString() }
    comments.set(id, next)
    return next
  },

  delete(id: string) {
    return comments.delete(id)
  },

  seed(sample: CommentModel[]) {
    for (const c of sample) comments.set(c.id, c)
  },
}

