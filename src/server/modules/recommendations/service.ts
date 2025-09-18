import { recommendForUser } from './personalize'
import { detectTrendingTopics, decayedCountsByKey } from './trending'
import { identifyKnowledgeGaps } from './gaps'
import { detectNearDuplicates } from './duplicates'
import { identifyExperts } from './experts'
import { relatedContent } from './related'
import type {
  ActivityEvent,
  Content,
  RecommendationOptions,
  Scored,
  TrendingTopic,
  DuplicateSet,
  ExpertiseProfile,
  RecommendationSummary,
} from './types'
import type { RecommendationDataSource } from './data-source'

export interface PersonalizedInput {
  userId: string
  workspaceId: string
  options?: RecommendationOptions
}

export class RecommendationService {
  constructor(private readonly dataSource: RecommendationDataSource) {}

  async personalized({ userId, workspaceId, options }: PersonalizedInput): Promise<Scored<Content>[]> {
    const [items, events] = await Promise.all([
      this.dataSource.listContent(workspaceId),
      this.dataSource.listEvents(workspaceId),
    ])
    return recommendForUser({
      userId,
      workspaceId,
      items,
      events,
      ...(options ? { options } : {}),
    })
  }

  async trending(workspaceId: string, nowMs?: number): Promise<{ topics: TrendingTopic[]; items: Scored<Content>[] }> {
    const [items, events] = await Promise.all([
      this.dataSource.listContent(workspaceId),
      this.dataSource.listEvents(workspaceId),
    ])
    const topics = detectTrendingTopics({
      events,
      workspaceId,
      ...(typeof nowMs === 'number' ? { nowMs } : {}),
    })
    const byId = new Map(items.map((item) => [item.id, item]))
    const counts = decayedCountsByKey(events, (e) => e.knowledgeId, nowMs ?? Date.now(), 12)
    const rankedItems = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, score]) => {
        const payload = id ? byId.get(id) : undefined
        return payload ? { id, score, payload } : null
      })
      .filter((entry): entry is Scored<Content> => entry !== null)
    return { topics, items: rankedItems }
  }

  async knowledgeGaps(userId: string, workspaceId: string, nowMs?: number) {
    const [items, events] = await Promise.all([
      this.dataSource.listContent(workspaceId),
      this.dataSource.listEvents(workspaceId),
    ])
    const trend = detectTrendingTopics({
      events,
      workspaceId,
      ...(typeof nowMs === 'number' ? { nowMs } : {}),
    })
    const trendingTagIds = trend
      .map((t) => t.key)
      .filter((key) => !key.startsWith('doc:'))

    return identifyKnowledgeGaps({
      userId,
      workspaceId,
      items,
      events,
      trendingTagIds,
      ...(typeof nowMs === 'number' ? { nowMs } : {}),
    })
  }

  async duplicates(workspaceId: string): Promise<DuplicateSet[]> {
    const items = await this.dataSource.listContent(workspaceId)
    return detectNearDuplicates(items)
  }

  async experts(workspaceId: string): Promise<ExpertiseProfile[]> {
    const [items, events] = await Promise.all([
      this.dataSource.listContent(workspaceId),
      this.dataSource.listEvents(workspaceId),
    ])
    return identifyExperts({ items, events, workspaceId })
  }

  async related(workspaceId: string, knowledgeId: string, limit = 10): Promise<Scored<Content>[]> {
    const items = await this.dataSource.listContent(workspaceId)
    return relatedContent(items, knowledgeId, limit)
  }

  async summary({ userId, workspaceId, options }: PersonalizedInput): Promise<RecommendationSummary> {
    const [items, events] = await Promise.all([
      this.dataSource.listContent(workspaceId),
      this.dataSource.listEvents(workspaceId),
    ])

    const personalized = recommendForUser({
      userId,
      workspaceId,
      items,
      events,
      ...(options ? { options } : {}),
    })

    const nowMs = options?.nowMs
    const topics = detectTrendingTopics({
      events,
      workspaceId,
      ...(typeof nowMs === 'number' ? { nowMs } : {}),
    })

    const byId = new Map(items.map((item) => [item.id, item]))
    const counts = decayedCountsByKey(events, (e) => e.knowledgeId, nowMs ?? Date.now(), 12)
    const trendingItems = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, score]) => {
        const payload = id ? byId.get(id) : undefined
        return payload ? { id, score, payload } : null
      })
      .filter((entry): entry is Scored<Content> => entry !== null)

    const trending = { topics, items: trendingItems }

    const gapResult = identifyKnowledgeGaps({
      userId,
      workspaceId,
      items,
      events,
      trendingTagIds: topics
        .map((t) => t.key)
        .filter((key) => !key.startsWith('doc:')),
      ...(typeof nowMs === 'number' ? { nowMs } : {}),
    })

    const experts = identifyExperts({ items, events, workspaceId })
    const duplicates = detectNearDuplicates(items)

    return {
      personalized,
      trending,
      gaps: gapResult,
      experts,
      duplicates,
    }
  }

  async recordEvent(event: Omit<ActivityEvent, 'id'> & { id?: string }) {
    return this.dataSource.appendEvent(event)
  }
}
