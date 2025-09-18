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
    const counts = decayedCountsByKey(events, (e) => e.knowledgeId, nowMs ?? Date.now(), 12)
    const rankedItems = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, score]) => ({ id, score, payload: items.find((d) => d.id === id)! }))
      .filter((entry) => entry.payload)
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
    return identifyKnowledgeGaps({
      userId,
      workspaceId,
      items,
      events,
      trendingTagIds: trend.map((t) => t.key),
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

  async recordEvent(event: Omit<ActivityEvent, 'id'> & { id?: string }) {
    return this.dataSource.appendEvent(event)
  }
}
