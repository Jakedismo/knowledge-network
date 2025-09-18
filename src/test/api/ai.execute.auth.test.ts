import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AI invoker to avoid network/SDK usage
vi.mock('@/server/modules/ai', async (orig) => {
  const mod = await orig()
  return {
    ...mod,
    invokeAgent: vi.fn().mockResolvedValue({ outputText: 'ok', model: 'gpt-5-mini' }),
  }
})

describe('API: /api/ai/execute auth', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test'
  })

  it('returns 401 without auth headers', async () => {
    const { POST } = await import('@/app/api/ai/execute/route')
    const req = new Request('http://localhost/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capability: 'chat', input: { question: 'hi' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('succeeds with x-user-id header', async () => {
    const { POST } = await import('@/app/api/ai/execute/route')
    const headers = new Headers({ 'content-type': 'application/json', 'x-user-id': 'u1' })
    const req = new Request('http://localhost/api/ai/execute', {
      method: 'POST',
      headers,
      body: JSON.stringify({ capability: 'chat', input: { question: 'hi' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.type).toBe('chat')
  })
})

