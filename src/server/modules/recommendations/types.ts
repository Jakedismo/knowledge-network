import type { IndexDocument } from '@/server/modules/search/types'

// Activity signals used for recommendations and analytics
export type ActivityType =
  | 'view'
  | 'like'
  | 'save'
  | 'comment'
  | 'share'
  | 'click'
  | 'followAuthor'
  | 'followTag'
  | 'search'

export interface ActivityEvent {
  id: string
  userId: string
  workspaceId: string
  type: ActivityType
  knowledgeId?: string
  authorId?: string
  tagIds?: string[]
  // Milliseconds since epoch for stable math and tests
  timestamp: number
  // Optional weight override (e.g., for AB tests)
  weight?: number
}

export interface RecommendationOptions {
  nowMs?: number
  maxResults?: number
  // Half-life in hours for recency decay on events
  eventHalfLifeHours?: number
  // Half-life in hours for content recency boost
  contentHalfLifeHours?: number
}

export interface Scored<T> {
  id: string
  score: number
  reasons?: string[]
  payload: T
}

export interface TrendingTopic {
  key: string // tagId or topic key
  score: number // z-score like metric
  volume: number
  delta: number
}

export interface DuplicateSet {
  representativeId: string
  memberIds: string[]
  similarity: number // average intra-set similarity
}

export interface ExpertiseProfile {
  userId: string
  topics: Array<{ tagId: string; score: number }>
  overall: number
}

export type Content = IndexDocument

export interface RecommendationSummary {
  personalized: Scored<Content>[]
  trending: {
    topics: TrendingTopic[]
    items: Scored<Content>[]
  }
  gaps: {
    underexposedTags: Array<{ tagId: string; deficit: number }>
    recommendations: Scored<Content>[]
  }
  experts: ExpertiseProfile[]
  duplicates: DuplicateSet[]
}
