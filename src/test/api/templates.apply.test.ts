import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock access guard to always allow with workspace context
vi.mock('@/server/modules/organization/api-guard', () => ({
  requireAccess: vi.fn().mockResolvedValue({ userId: 'u1', workspaceId: 'w1' })
}))

// Mock startup side-effects
vi.mock('@/server/startup', () => ({}))

// Mock template service
vi.mock('@/server/modules/templates/template.service', () => ({
  templateService: {
    apply: vi.fn().mockResolvedValue({ id: 'newdoc', workspaceId: 'w1' }),
    publish: vi.fn().mockResolvedValue({ id: 'list1', visibility: 'PUBLIC' }),
    share: vi.fn().mockResolvedValue(undefined),
  }
}))

describe('API: templates apply/share/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies a template', async () => {
    const { POST } = await import('@/app/api/templates/[id]/apply/route')
    const req = new Request('http://localhost/api/templates/tpl1/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: { workspaceId: 'w1', authorId: 'u1' }, values: { name: 'Ada' } }),
    })
    const res = await POST(req, { params: { id: 'tpl1' } })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('newdoc')
  })

  it('shares a template', async () => {
    const { POST } = await import('@/app/api/templates/[id]/share/route')
    const req = new Request('http://localhost/api/templates/tpl1/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'w1', grants: [{ kind: 'USER', subjectId: 'u2', permissions: ['template:use'] }] }),
    })
    const res = await POST(req, { params: { id: 'tpl1' } })
    expect(res.status).toBe(204)
  })

  it('publishes a template', async () => {
    const { POST } = await import('@/app/api/templates/[id]/publish/route')
    const req = new Request('http://localhost/api/templates/tpl1/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'w1', creatorId: 'u1', visibility: 'PUBLIC', title: 'T' }),
    })
    const res = await POST(req, { params: { id: 'tpl1' } })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.visibility).toBe('PUBLIC')
  })
})

