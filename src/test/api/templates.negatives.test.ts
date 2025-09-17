import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/modules/organization/api-guard', () => ({
  requireAccess: vi.fn().mockResolvedValue({ userId: 'u1', workspaceId: 'w1' })
}))
vi.mock('@/server/modules/templates/template.service', () => ({
  templateService: {
    apply: vi.fn(),
    publish: vi.fn(),
    commitVersion: vi.fn(),
  }
}))
vi.mock('@/server/startup', () => ({}))

describe('API: templates negative cases', () => {
  beforeEach(() => vi.clearAllMocks())

  it('apply returns 400 for missing target fields', async () => {
    const { POST } = await import('@/app/api/templates/[id]/apply/route')
    const req = new Request('http://localhost/api/templates/t1/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: { authorId: 'u1' } })
    })
    const res = await POST(req, { params: { id: 't1' } })
    expect(res.status).toBe(400)
  })

  it('publish returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/templates/[id]/publish/route')
    const req = new Request('http://localhost/api/templates/t1/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visibility: 'PUBLIC' })
    })
    const res = await POST(req, { params: { id: 't1' } })
    expect(res.status).toBe(400)
  })

  it('versions returns 400 when authorId missing', async () => {
    const { POST } = await import('@/app/api/templates/[id]/versions/route')
    const req = new Request('http://localhost/api/templates/t1/versions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'x' })
    })
    const res = await POST(req, { params: { id: 't1' } })
    expect(res.status).toBe(400)
  })
})

