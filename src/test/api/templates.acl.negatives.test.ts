import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

describe('API: templates ACL negatives', () => {
  beforeEach(() => vi.resetModules())

  it('share returns 403 when access denied', async () => {
    vi.doMock('@/server/modules/organization/api-guard', () => ({
      requireAccess: vi.fn().mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }))
    vi.doMock('@/server/modules/templates/template.service', () => ({
      templateService: { share: vi.fn() }
    }))
    vi.doMock('@/server/startup', () => ({}))

    const { POST } = await import('@/app/api/templates/[id]/share/route')
    const req = new Request('http://localhost/api/templates/t1/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'w1', grants: [] })
    })
    const res = await POST(req, { params: { id: 't1' } })
    expect(res.status).toBe(403)
  })
})

