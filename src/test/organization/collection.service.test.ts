import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => {
  const store: Record<string, { parentId: string | null }> = {
    A: { parentId: null },
    B: { parentId: 'A' },
    C: { parentId: 'B' },
  }
  return {
    prisma: {
      collection: {
        findUnique: vi.fn(async ({ where }: any) => store[where.id] ?? null),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
        count: vi.fn(async ({ where }: any) => Object.values(store).filter((x) => x.parentId === where.parentId).length),
        findMany: vi.fn(),
      },
    },
  }
})

import { collectionService } from '@/server/modules/organization/collection.service'

describe('CollectionService.move', () => {
  it('rejects moving under itself', async () => {
    await expect(collectionService.move({ id: 'A', parentId: 'A', workspaceId: 'W' })).rejects.toThrow()
  })

  it('rejects cycles (descendant as parent)', async () => {
    await expect(collectionService.move({ id: 'A', parentId: 'C', workspaceId: 'W' })).rejects.toThrow()
  })
})

