import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/prisma', () => {
  const now = new Date('2025-01-01T00:00:00Z')
  return {
    prisma: {
      knowledge: {
        findUnique: vi.fn(async () => ({
          id: 'k1',
          title: 'Hello',
          content: 'Hello world content',
          excerpt: 'Hello world',
          status: 'PUBLISHED',
          createdAt: now,
          updatedAt: now,
          metadata: { priority: 'high' },
          workspaceId: 'W',
          author: { id: 'U', displayName: 'Alice' },
          collection: { id: 'C2', name: 'Child', parentId: 'C1', workspaceId: 'W' },
          tags: [{ tag: { id: 't1', name: 'react', color: null } }],
        })),
      },
      metadataIndexEntry: {
        findMany: vi.fn(async () => [
          { keyPath: 'priority', valueType: 'STRING', stringVal: 'high', numberVal: null, dateVal: null, boolVal: null },
        ]),
      },
      collection: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === 'C2') return { id: 'C2', name: 'Child', parentId: 'C1' }
          if (where.id === 'C1') return { id: 'C1', name: 'Root', parentId: null }
          return null
        }),
      },
    },
  }
})

import { projectKnowledgeToIndex } from '@/server/modules/search/projection'

describe('projectKnowledgeToIndex', () => {
  it('builds a complete index document', async () => {
    const doc = await projectKnowledgeToIndex('k1')
    expect(doc?.id).toBe('k1')
    expect(doc?.collectionPath.map((p) => p.name)).toEqual(['Root', 'Child'])
    expect(doc?.tags[0]?.name).toBe('react')
    expect(doc?.facets[0]?.keyPath).toBe('priority')
  })
})

