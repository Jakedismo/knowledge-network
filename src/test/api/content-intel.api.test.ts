import { describe, it, expect } from 'vitest'

describe('Content Intelligence API', () => {
  it('POST /api/content-intel/summarize', async () => {
    const { POST } = await import('@/app/api/content-intel/summarize/route')
    const headers = new Headers({ 'x-user-id': 'u1', 'x-workspace-id': 'w1' })
    const req = new Request('http://local/api/content-intel/summarize', { method: 'POST', headers, body: JSON.stringify({ content: 'This is a test. It should summarize well. The module selects key sentences.' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.summary).toBeTypeOf('string')
  })

  it('POST /api/content-intel/analyze', async () => {
    const { POST } = await import('@/app/api/content-intel/analyze/route')
    const headers = new Headers({ 'x-user-id': 'u1', 'x-workspace-id': 'w1' })
    const req = new Request('http://local/api/content-intel/analyze', { method: 'POST', headers, body: JSON.stringify({ content: 'Hello world! Knowledge graphs connect entities. Email x@y.com', title: 'Knowledge Graphs' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tags.length).toBeGreaterThan(0)
    expect(data.entities.length).toBeGreaterThan(0)
  })
})
