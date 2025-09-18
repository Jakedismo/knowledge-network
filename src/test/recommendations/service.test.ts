import { describe, it, expect } from 'vitest'
import { InMemoryRecommendationDataSource } from '@/server/modules/recommendations/data-source'
import { RecommendationService } from '@/server/modules/recommendations/service'
import { seedDemoData } from '@/server/modules/recommendations/demo-data'

const dataSource = new InMemoryRecommendationDataSource()
const workspaceId = seedDemoData(dataSource)
const service = new RecommendationService(dataSource)
const userId = 'u_me'

describe('RecommendationService (demo data)', () => {
  it('returns personalized results for demo user', async () => {
    const results = await service.personalized({ userId, workspaceId, options: { maxResults: 5 } })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].payload.workspaceId).toBe(workspaceId)
  })

  it('surfaces trending topics and items', async () => {
    const trending = await service.trending(workspaceId)
    expect(trending.topics.length).toBeGreaterThan(0)
    expect(trending.items.length).toBeGreaterThan(0)
  })

  it('identifies knowledge gaps', async () => {
    const gaps = await service.knowledgeGaps(userId, workspaceId)
    expect(gaps.underexposedTags.length).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(gaps.recommendations)).toBe(true)
  })

  it('detects duplicate content clusters', async () => {
    const dupes = await service.duplicates(workspaceId)
    expect(dupes.length).toBeGreaterThan(0)
    expect(new Set(dupes[0].memberIds).size).toBeGreaterThan(1)
  })

  it('builds a combined summary payload', async () => {
    const summary = await service.summary({ userId, workspaceId, options: { maxResults: 5 } })
    expect(summary.personalized.length).toBeGreaterThan(0)
    expect(summary.trending.topics.length).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(summary.gaps.recommendations)).toBe(true)
    expect(Array.isArray(summary.experts)).toBe(true)
    expect(Array.isArray(summary.duplicates)).toBe(true)
  })
})
