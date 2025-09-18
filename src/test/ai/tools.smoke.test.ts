import { describe, it, expect, vi } from 'vitest'

vi.mock('@/server/modules/organization/acl.service', async (orig) => {
  const mod = await orig()
  return { ...mod, aclService: { checkAccess: vi.fn().mockResolvedValue(true) } }
})

describe('AI tools: workspace', () => {
  it('search_workspace_documents returns list', async () => {
    const { buildWorkspaceAgentTools } = await import('@/server/modules/ai/tools')
    const tools = buildWorkspaceAgentTools()
    const tool = tools.find((t) => t.name === 'search_workspace_documents')!
    // Mock search service
    vi.mock('@/server/modules/search/search.service', async (orig) => {
      const mod = await orig()
      return {
        ...mod,
        getSearchService: () => ({
          search: async () => ({
            hits: { total: 1, items: [{ document: { id: 'k1', title: 'Doc', path: '/p', excerpt: 'hi', tags: [] }, score: 1 } as any] },
          }),
        }),
      }
    })
    const out = await tool.execute({ query: 'x', limit: 5 }, { userId: 'u1', workspaceId: 'w1' })
    expect(Array.isArray(out)).toBe(true)
    expect(out[0].id).toBe('k1')
  })

  it('delete_document requires confirm', async () => {
    const { buildWorkspaceAgentTools } = await import('@/server/modules/ai/tools')
    const tools = buildWorkspaceAgentTools()
    const del = tools.find((t) => t.name === 'delete_document')!
    await expect(del.execute({ id: 'k1' }, { userId: 'u1', workspaceId: 'w1' })).rejects.toBeTruthy()
  })

  it('publish_template requires confirm', async () => {
    const { buildWorkspaceAgentTools } = await import('@/server/modules/ai/tools')
    const tools = buildWorkspaceAgentTools()
    const pub = tools.find((t) => t.name === 'publish_template')!
    await expect(pub.execute({ id: 'tpl1', visibility: 'PUBLIC', title: 'T' }, { userId: 'u1', workspaceId: 'w1' })).rejects.toBeTruthy()
  })
})
