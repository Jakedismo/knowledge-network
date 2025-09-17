import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/prisma', () => {
  return {
    prisma: {
      tag: {
        findMany: vi.fn(async () => [
          { id: 't1', workspaceId: 'W', name: 'react', color: null, usageCount: 100, createdAt: new Date() },
          { id: 't2', workspaceId: 'W', name: 'typescript', color: null, usageCount: 50, createdAt: new Date() },
          { id: 't3', workspaceId: 'W', name: 'testing', color: null, usageCount: 10, createdAt: new Date() },
        ]),
      },
    },
  }
})

import { tagService } from '@/server/modules/organization/tag.service'

describe('TagService.suggest', () => {
  it('prefers exact/prefix matches over popularity', async () => {
    const items = await tagService.suggest({ workspaceId: 'W', query: 'tes', contentText: '' })
    expect(items[0]?.name).toBe('testing')
  })

  it('uses contentText signals when query is empty', async () => {
    const items = await tagService.suggest({ workspaceId: 'W', query: '', contentText: '... Typescript is great ...' })
    expect(items.some((t) => t.name === 'typescript')).toBe(true)
  })
})

