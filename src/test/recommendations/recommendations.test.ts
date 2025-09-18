import { describe, it, expect } from 'vitest'
import { recommendForUser } from '@/server/modules/recommendations/personalize'
import { detectTrendingTopics } from '@/server/modules/recommendations/trending'
import { detectNearDuplicates } from '@/server/modules/recommendations/duplicates'
import { identifyExperts } from '@/server/modules/recommendations/experts'
import type { ActivityEvent } from '@/server/modules/recommendations/types'

const now = Date.UTC(2025, 8, 18) // 2025-09-18
const HOUR = 60 * 60 * 1000

const items = [
  doc('k1', 'Intro to CRDTs', ['realtime', 'crdt'], 'u_alice', 'c_realtime', now - 5 * HOUR),
  doc('k2', 'Operational Transformations vs CRDTs', ['realtime', 'crdt'], 'u_bob', 'c_realtime', now - 10 * HOUR),
  doc('k3', 'ElasticSearch RRF: BM25 + Vectors', ['search', 'elasticsearch'], 'u_cara', 'c_search', now - 2 * HOUR),
  doc('k4', 'Index Tuning in ElasticSearch', ['search', 'elasticsearch'], 'u_cara', 'c_search', now - 30 * HOUR),
  doc('k5', 'Access Control with RBAC', ['security', 'rbac'], 'u_alice', 'c_security', now - 50 * HOUR),
]

const events: ActivityEvent[] = [
  ev('u_me', 'view', 'k1', ['realtime', 'crdt'], now - 3 * HOUR),
  ev('u_me', 'like', 'k1', ['realtime', 'crdt'], now - 3 * HOUR),
  ev('u_me', 'view', 'k3', ['search', 'elasticsearch'], now - 1 * HOUR),
  ev('u_t1', 'view', 'k3', ['search', 'elasticsearch'], now - 1 * HOUR),
  ev('u_t2', 'view', 'k3', ['search', 'elasticsearch'], now - 1.5 * HOUR),
  ev('u_t3', 'view', 'k4', ['search', 'elasticsearch'], now - 1.2 * HOUR),
]

describe('recommendations pipeline', () => {
  it('personalizes based on tag/author affinity and neighbors', () => {
    const res = recommendForUser({ userId: 'u_me', workspaceId: 'w1', items, events, options: { nowMs: now } })
    // Should recommend k2 (similar to k1) and k4 (similar to k3) before k5
    const ids = res.map((r) => r.id)
    expect(ids[0]).toBe('k2')
    expect(ids).toContain('k4')
    expect(ids.indexOf('k5')).toBeGreaterThan(ids.indexOf('k4'))
  })

  it('detects trending topics with recent spikes', () => {
    const trending = detectTrendingTopics({ events, workspaceId: 'w1', nowMs: now, windowMinutes: 180, baselineMinutes: 24 * 60 })
    const keys = trending.map((t) => t.key)
    expect(keys.some((k) => k.includes('search'))).toBe(true)
  })

  it('clusters near-duplicate documents', () => {
    const dupItems = [
      doc('d1', 'Guide to RBAC', ['security'], 'u_a', 'c1', now - 1000, 'Role based access control overview and best practices.'),
      doc('d2', 'Guide to RBAC', ['security'], 'u_b', 'c1', now - 900, 'Role based access control overview and best practices!'),
      doc('d3', 'Unrelated topic', ['search'], 'u_c', 'c2', now - 800, 'Elastic tuning guide'),
    ]
    const sets = detectNearDuplicates(dupItems, 0.8, 3)
    expect(sets.length).toBe(1)
    expect(sets[0].memberIds.sort()).toEqual(['d1', 'd2'])
  })

  it('identifies experts by engagement on authored content', () => {
    const profs = identifyExperts({ items, events, workspaceId: 'w1', nowMs: now })
    expect(profs[0].userId).toBe('u_cara') // search docs received team views
    const topCaraTopic = profs[0].topics[0].tagId
    expect(['search', 'elasticsearch']).toContain(topCaraTopic)
  })
})

// Helpers
function doc(
  id: string,
  title: string,
  tags: string[],
  authorId: string,
  collectionId: string,
  updatedAtMs: number,
  content = ''
) {
  return {
    id,
    workspaceId: 'w1',
    title,
    content: content || `${title} body with ${tags.join(', ')}`,
    status: 'PUBLISHED',
    author: { id: authorId, displayName: authorId },
    collection: { id: collectionId, name: collectionId, path: `/${collectionId}` },
    tags: tags.map((t) => ({ id: t, name: t })),
    metadata: {},
    viewCount: 0,
    createdAt: new Date(updatedAtMs - 10 * HOUR).toISOString(),
    updatedAt: new Date(updatedAtMs).toISOString(),
  }
}

function ev(userId: string, type: ActivityEvent['type'], knowledgeId: string, tagIds: string[], ts: number): ActivityEvent {
  return { id: `${userId}-${knowledgeId}-${type}-${ts}`, userId, workspaceId: 'w1', type, knowledgeId, tagIds, timestamp: ts }
}
