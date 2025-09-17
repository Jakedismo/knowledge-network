import { describe, it, expect, vi, beforeEach } from 'vitest'
import { templateService } from '@/server/modules/templates/template.service'

vi.mock('@/lib/db/prisma', () => {
  const tx = {
    knowledgeVersion: { create: vi.fn(), deleteMany: vi.fn() },
    templateListing: { deleteMany: vi.fn() },
    knowledge: { delete: vi.fn(), update: vi.fn(), create: vi.fn() },
  }
  return {
    prisma: {
      $transaction: (fn: any) => fn(tx),
      knowledge: {
        create: vi.fn().mockResolvedValue({ id: 'k1', workspaceId: 'w1' }),
        update: vi.fn().mockResolvedValue({ id: 'k1', workspaceId: 'w1' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'k1', workspaceId: 'w1', version: 1, content: 'A' }),
      },
      knowledgeVersion: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      templateListing: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 't1' }), update: vi.fn() },
      activityLog: { create: vi.fn() },
    },
  }
})

vi.mock('@/server/modules/search/emitter', () => ({ emitUpsert: vi.fn(), emitDelete: vi.fn() }))

describe('templateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a template and initial version', async () => {
    const res = await templateService.create({ workspaceId: 'w1', authorId: 'u1', title: 'T', content: 'C' })
    expect(res.id).toBe('k1')
  })

  it('applies a template', async () => {
    const created = await templateService.apply({ templateId: 'k1', target: { workspaceId: 'w1', authorId: 'u1' } })
    expect(created.id).toBe('k1')
  })
})

