import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
    vi.resetModules() // Ensure env vars are read for each test
    process.env.OPENAI_API_KEY = 'test'
  })

  afterEach(() => {
    delete process.env.AI_REQUIRE_RBAC
    delete process.env.OPENAI_API_KEY
  })

  it('returns 401 without auth headers when RBAC is enforced', async () => {
    process.env.AI_REQUIRE_RBAC = '1'
    const { POST } = await import('@/app/api/ai/execute/route')
    const req = new Request('http://localhost/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capability: 'chat', input: { question: 'hi' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('succeeds without auth headers in dev mode (RBAC disabled)', async () => {
    // AI_REQUIRE_RBAC is not set, defaults to '0', so dev mode is active
    const { POST } = await import('@/app/api/ai/execute/route')
    const req = new Request('http://localhost/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capability: 'chat', input: { question: 'hi' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200) // Dev mode synthesizes a user, leading to a 200 OK
    const data = await res.json()
    expect(data.type).toBe('chat')
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