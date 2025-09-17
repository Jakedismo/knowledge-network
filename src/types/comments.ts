export type CommentStatus = 'open' | 'resolved' | 'deleted' | 'hidden'

export interface CommentMention {
  userId: string
  displayName: string
  start: number
  length: number
}

export interface CommentPositionData {
  // Anchor by editor block id or heading id
  blockId?: string
  headingId?: string
  headingText?: string
}

export interface CommentModel {
  id: string
  knowledgeId: string
  parentId?: string | null
  authorId: string
  content: string
  mentions: CommentMention[]
  positionData?: CommentPositionData | null
  status: CommentStatus
  createdAt: string
  updatedAt: string
  // Derived
  replies?: CommentModel[]
}

export interface CreateCommentInput {
  knowledgeId: string
  parentId?: string | null
  content: string
  mentions?: CommentMention[]
  positionData?: CommentPositionData | null
}

export interface UpdateCommentInput {
  content?: string
  status?: CommentStatus
}

