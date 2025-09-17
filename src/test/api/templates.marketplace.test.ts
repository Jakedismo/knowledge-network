import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    templateListing: {
      findMany: vi.fn().mockResolvedValue([{ id: 'l1', title: 'Public Tpl', templateId: 't1', visibility: 'PUBLIC' }])
    }
  }
}))

vi.mock('@/server/startup', () => ({}))

describe('API: templates marketplace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists marketplace templates', async () => {
    const { GET } = await import('@/app/api/templates/marketplace/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.listings)).toBe(true)
  })
})

