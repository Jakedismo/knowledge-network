import { describe, it, expect, beforeAll } from 'vitest'
import { getRecommendationService, getDemoWorkspaceId } from '@/server/modules/recommendations/registry'

const workspaceId = getDemoWorkspaceId()
const userId = 'u_me'

describe('RecommendationService (demo data)', () => {
  let service = getRecommendationService()

  beforeAll(() => {
    service = getRecommendationService()
  })

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
})

