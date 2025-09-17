import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/modules/organization/api-guard', () => ({
  requireAccess: vi.fn().mockResolvedValue({ userId: 'u1', workspaceId: 'w1' })
}))
vi.mock('@/server/modules/templates/template.service', () => ({
  templateService: {
    listVersions: vi.fn().mockResolvedValue([{ id: 'v1', versionNumber: 1, branchName: 'main' }]),
    commitVersion: vi.fn().mockResolvedValue(undefined),
  }
}))
vi.mock('@/server/startup', () => ({}))

describe('API: templates versions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists versions', async () => {
    const { GET } = await import('@/app/api/templates/[id]/versions/route')
    const url = new URL('http://localhost/api/templates/t1/versions?branch=main')
    const res = await GET(new Request(url), { params: { id: 't1' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('commits a new version', async () => {
    const { POST } = await import('@/app/api/templates/[id]/versions/route')
    const req = new Request('http://localhost/api/templates/t1/versions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authorId: 'u1', content: 'New content', changeSummary: 'feat: update' })
    })
    const res = await POST(req, { params: { id: 't1' } })
    expect(res.status).toBe(201)
  })
})

