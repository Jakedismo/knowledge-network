import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/modules/organization/api-guard', () => ({
  requireAccess: vi.fn().mockResolvedValue({ userId: 'u1', workspaceId: 'w1' })
}))
vi.mock('@/server/modules/templates/template.service', () => ({
  templateService: {
    list: vi.fn().mockResolvedValue({ templates: [{ id: 't1', title: 'Temp 1' }], marketplace: [] }),
    get: vi.fn().mockResolvedValue({ id: 't1', versions: [] }),
  }
}))
vi.mock('@/server/startup', () => ({}))

describe('API: templates list/details', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists workspace templates', async () => {
    const { GET } = await import('@/app/api/templates/route')
    const url = new URL('http://localhost/api/templates?workspaceId=w1&marketplace=1')
    const res = await GET(new Request(url))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.templates)).toBe(true)
  })

  it('gets template details', async () => {
    const { GET } = await import('@/app/api/templates/[id]/route')
    const res = await GET(new Request('http://localhost/api/templates/t1'), { params: { id: 't1' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('t1')
  })
})

