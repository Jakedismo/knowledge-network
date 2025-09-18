import { InMemoryRecommendationDataSource } from './data-source'
import type { Content, ActivityEvent } from './types'
import { KnowledgeStatus } from '@/server/modules/search/types'

const WORKSPACE_ID = 'demo-workspace'

const documents: Content[] = [
  {
    id: 'k1',
    workspaceId: WORKSPACE_ID,
    title: 'Operational Transformations vs CRDTs',
    content: 'Deep dive into OT and CRDT trade-offs for collaborative editors.',
    excerpt: 'Compare OT and CRDT for real-time collaboration.',
    status: KnowledgeStatus.PUBLISHED,
    author: { id: 'u_alice', displayName: 'Alice Harper' },
    collection: { id: 'coll_realtime', name: 'Realtime Systems', path: '/realtime' },
    tags: [
      { id: 'realtime', name: 'Realtime' },
      { id: 'crdt', name: 'CRDT' },
    ],
    metadata: {},
    facets: [],
    viewCount: 128,
    createdAt: new Date('2025-08-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-09-15T12:00:00Z').toISOString(),
    searchVector: [0.12, 0.44, 0.31, 0.62, 0.1, 0.22],
  },
  {
    id: 'k2',
    workspaceId: WORKSPACE_ID,
    title: 'ElasticSearch RRF: BM25 + Vectors',
    content: 'How we blend BM25 with vector similarity using reciprocal rank fusion.',
    excerpt: 'Implement reciprocal rank fusion in ElasticSearch.',
    status: KnowledgeStatus.PUBLISHED,
    author: { id: 'u_cara', displayName: 'Cara Singh' },
    collection: { id: 'coll_search', name: 'Search Platform', path: '/search' },
    tags: [
      { id: 'search', name: 'Search' },
      { id: 'elasticsearch', name: 'ElasticSearch' },
    ],
    metadata: {},
    facets: [],
    viewCount: 98,
    createdAt: new Date('2025-07-20T09:00:00Z').toISOString(),
    updatedAt: new Date('2025-09-16T08:00:00Z').toISOString(),
    searchVector: [0.31, 0.11, 0.72, 0.05, 0.44, 0.2],
  },
  {
    id: 'k3',
    workspaceId: WORKSPACE_ID,
    title: 'Index Tuning in ElasticSearch',
    content: 'Sharding, replicas, and index template tips for consistent latency.',
    status: KnowledgeStatus.PUBLISHED,
    author: { id: 'u_cara', displayName: 'Cara Singh' },
    collection: { id: 'coll_search', name: 'Search Platform', path: '/search' },
    tags: [
      { id: 'search', name: 'Search' },
      { id: 'elasticsearch', name: 'ElasticSearch' },
    ],
    metadata: {},
    facets: [],
    viewCount: 142,
    createdAt: new Date('2025-06-12T18:00:00Z').toISOString(),
    updatedAt: new Date('2025-09-17T14:00:00Z').toISOString(),
    searchVector: [0.29, 0.13, 0.69, 0.08, 0.48, 0.19],
  },
  {
    id: 'k4',
    workspaceId: WORKSPACE_ID,
    title: 'Guide to RBAC',
    content: 'Role based access control overview and best practices.',
    status: KnowledgeStatus.PUBLISHED,
    author: { id: 'u_alice', displayName: 'Alice Harper' },
    collection: { id: 'coll_security', name: 'Security', path: '/security' },
    tags: [
      { id: 'security', name: 'Security' },
      { id: 'rbac', name: 'RBAC' },
    ],
    metadata: {},
    facets: [],
    viewCount: 72,
    createdAt: new Date('2025-05-01T09:30:00Z').toISOString(),
    updatedAt: new Date('2025-09-10T11:00:00Z').toISOString(),
  },
  {
    id: 'k5',
    workspaceId: WORKSPACE_ID,
    title: 'Guide to RBAC',
    content: 'Role based access control overview and best practices!',
    status: KnowledgeStatus.PUBLISHED,
    author: { id: 'u_bob', displayName: 'Bob Keane' },
    collection: { id: 'coll_security', name: 'Security', path: '/security' },
    tags: [
      { id: 'security', name: 'Security' },
      { id: 'rbac', name: 'RBAC' },
    ],
    metadata: {},
    facets: [],
    viewCount: 50,
    createdAt: new Date('2025-05-02T09:30:00Z').toISOString(),
    updatedAt: new Date('2025-09-12T12:00:00Z').toISOString(),
  },
  {
    id: 'k6',
    workspaceId: WORKSPACE_ID,
    title: 'CRDT Conflict Resolution Patterns',
    content: 'How to design merge rules and awareness states in collaborative apps.',
    status: KnowledgeStatus.PUBLISHED,
    author: { id: 'u_dylan', displayName: 'Dylan Cho' },
    collection: { id: 'coll_realtime', name: 'Realtime Systems', path: '/realtime' },
    tags: [
      { id: 'realtime', name: 'Realtime' },
      { id: 'crdt', name: 'CRDT' },
    ],
    metadata: {},
    facets: [],
    viewCount: 64,
    createdAt: new Date('2025-08-12T11:55:00Z').toISOString(),
    updatedAt: new Date('2025-09-17T20:00:00Z').toISOString(),
    searchVector: [0.14, 0.47, 0.28, 0.64, 0.12, 0.2],
  },
]

const events: ActivityEvent[] = [
  activity('u_me', 'view', 'k1', ['realtime', 'crdt'], hoursAgo(3)),
  activity('u_me', 'like', 'k1', ['realtime', 'crdt'], hoursAgo(3)),
  activity('u_me', 'view', 'k2', ['search', 'elasticsearch'], hoursAgo(1.5)),
  activity('u_me', 'save', 'k2', ['search', 'elasticsearch'], hoursAgo(1.4)),
  activity('u_me', 'comment', 'k3', ['search', 'elasticsearch'], hoursAgo(4)),
  activity('u_me', 'view', 'k6', ['realtime', 'crdt'], hoursAgo(6)),
  activity('u_alex', 'view', 'k2', ['search', 'elasticsearch'], hoursAgo(0.8)),
  activity('u_alex', 'view', 'k3', ['search', 'elasticsearch'], hoursAgo(1.1)),
  activity('u_inez', 'view', 'k3', ['search', 'elasticsearch'], hoursAgo(1.2)),
  activity('u_inez', 'share', 'k3', ['search', 'elasticsearch'], hoursAgo(1)),
  activity('u_li', 'view', 'k1', ['realtime', 'crdt'], hoursAgo(2)),
  activity('u_li', 'followAuthor', undefined, [], hoursAgo(2.5), { authorId: 'u_alice' }),
  activity('u_me', 'followTag', undefined, ['search'], hoursAgo(12)),
  activity('u_dylan', 'comment', 'k6', ['realtime', 'crdt'], hoursAgo(0.5)),
]

export function seedDemoData(data: InMemoryRecommendationDataSource): string {
  for (const doc of documents) {
    void data.upsertContent(WORKSPACE_ID, doc)
  }
  for (const event of events) {
    void data.appendEvent(event)
  }
  return WORKSPACE_ID
}

function activity(
  userId: string,
  type: ActivityEvent['type'],
  knowledgeId: string | undefined,
  tagIds: string[] | undefined,
  timestamp: number,
  overrides?: Partial<ActivityEvent>
): ActivityEvent {
  const base: ActivityEvent = {
    id: `${userId}-${type}-${knowledgeId ?? 'none'}-${timestamp}`,
    userId,
    workspaceId: WORKSPACE_ID,
    type,
    timestamp,
  }

  if (knowledgeId) {
    base.knowledgeId = knowledgeId
  }
  if (tagIds && tagIds.length > 0) {
    base.tagIds = tagIds
  }
  if (overrides) {
    Object.assign(base, overrides)
  }

  return base
}

function hoursAgo(hours: number): number {
  const now = Date.UTC(2025, 8, 18, 12, 0, 0)
  return now - hours * 60 * 60 * 1000
}

export const DEMO_WORKSPACE_ID = WORKSPACE_ID
