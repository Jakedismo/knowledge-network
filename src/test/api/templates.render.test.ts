import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock template service with configurable behavior
const getMock = vi.fn()
vi.mock('@/server/modules/templates/template.service', () => ({
  templateService: {
    get: (...args: any[]) => getMock(...args),
  },
}))

describe('API: templates render', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('renders DB-backed template content', async () => {
    getMock.mockResolvedValue({ id: 'tpl-db', content: 'Hello {{ name }}' })
    const { POST } = await import('@/app/api/templates/render/route')
    const req = new Request('http://localhost/api/templates/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId: 'tpl-db', context: { name: 'Ada' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toContain('Hello Ada')
  })

  it('renders builtin template when DB not found', async () => {
    getMock.mockResolvedValue(undefined)
    const { POST } = await import('@/app/api/templates/render/route')
    const req = new Request('http://localhost/api/templates/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId: 'meeting-notes-v1', context: { title: 'Weekly' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toContain('Weekly')
  })

  it('returns 404 for unknown id', async () => {
    getMock.mockResolvedValue(undefined)
    const { POST } = await import('@/app/api/templates/render/route')
    const req = new Request('http://localhost/api/templates/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId: 'nope', context: {} }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(404)
  })
})

