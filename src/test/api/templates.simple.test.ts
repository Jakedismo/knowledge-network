import { describe, it, expect } from 'vitest'

describe('API: templates-simple', () => {
  it('lists builtin templates', async () => {
    const { GET } = await import('@/app/api/templates-simple/route')
    const res = await GET(new Request('http://localhost/api/templates-simple'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.templates)).toBe(true)
    expect(data.templates.length).toBeGreaterThan(0)
    // Has required fields
    expect(data.templates[0]).toHaveProperty('id')
    expect(data.templates[0]).toHaveProperty('title')
  })
})

