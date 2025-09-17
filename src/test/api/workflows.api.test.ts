import { describe, it, expect, vi } from 'vitest'

// Mock ACL guard to allow access without hitting Prisma-backed ACLs
vi.mock('@/server/modules/organization/api-guard', () => ({
  requireAccess: async () => ({ userId: 'u-admin', workspaceId: 'w1' }),
  requireAuth: async () => ({ userId: 'u-admin', workspaceId: 'w1' }),
}))

import { POST as createWorkflow, GET as listWorkflows } from '@/app/api/workflows/route'
import { POST as startReview } from '@/app/api/workflows/[id]/start/route'
import { POST as decide } from '@/app/api/reviews/[id]/decide/route'
import { POST as reopen } from '@/app/api/reviews/[id]/reopen/route'

const headers = new Headers({ 'x-user-id': 'u-admin', 'x-workspace-id': 'w1' })

describe('Workflows API (mocked ACL)', () => {
  it('creates, lists, starts and approves a workflow', async () => {
    const body = {
      name: 'API Review',
      description: 'via tests',
      steps: [
        { index: 0, type: 'SINGLE_APPROVAL', name: 'Peer', assignees: [{ assigneeType: 'USER', assigneeId: 'peer' }] },
        { index: 1, type: 'SINGLE_APPROVAL', name: 'Lead', assignees: [{ assigneeType: 'USER', assigneeId: 'lead' }] },
      ],
    }
    const reqCreate = new Request('http://local/api/workflows', { method: 'POST', headers, body: JSON.stringify(body) })
    const resCreate = await createWorkflow(reqCreate)
    expect(resCreate.ok).toBe(true)
    const { data: wf } = (await resCreate.json()) as any
    expect(wf.id).toBeDefined()

    const reqList = new Request('http://local/api/workflows', { method: 'GET', headers })
    const resList = await listWorkflows(reqList)
    expect(resList.ok).toBe(true)
    const list = (await resList.json()) as any
    expect(list.data.length).toBeGreaterThan(0)

    const reqStart = new Request('http://local/api/workflows/x/start', { method: 'POST', headers, body: JSON.stringify({ knowledgeId: 'k1' }) })
    const resStart = await startReview(reqStart, { params: { id: wf.id } as any })
    expect(resStart.ok).toBe(true)
    const { data: review } = (await resStart.json()) as any

    const approve1 = await decide(new Request('http://local/api/reviews/x/decide', { method: 'POST', headers, body: JSON.stringify({ decision: 'APPROVE' }) }), { params: { id: review.id } as any })
    expect(approve1.ok).toBe(true)
    const s1 = (await approve1.json()) as any
    expect(s1.data.advanced).toBe(true)

    const approve2 = await decide(new Request('http://local/api/reviews/x/decide', { method: 'POST', headers, body: JSON.stringify({ decision: 'APPROVE' }) }), { params: { id: review.id } as any })
    const s2 = (await approve2.json()) as any
    expect(s2.data.status).toBe('APPROVED')
  })

  it('reopens after changes requested', async () => {
    const body = {
      name: 'API Reopen',
      steps: [{ index: 0, type: 'SINGLE_APPROVAL', name: 'Peer', assignees: [{ assigneeType: 'USER', assigneeId: 'peer' }] }],
    }
    const resCreate = await createWorkflow(new Request('http://local/api/workflows', { method: 'POST', headers, body: JSON.stringify(body) }))
    const wf = (await resCreate.json() as any).data
    const resStart = await startReview(new Request('http://local/api/workflows/x/start', { method: 'POST', headers, body: JSON.stringify({ knowledgeId: 'k1' }) }), { params: { id: wf.id } as any })
    const review = (await resStart.json() as any).data
    // Request changes first
    const { POST: requestChanges } = await import('@/app/api/reviews/[id]/request-changes/route')
    await requestChanges(new Request('http://local/api/reviews/x/request-changes', { method: 'POST', headers, body: JSON.stringify({ versionFromId: 'v1', versionToId: 'v2', summary: 'typos' }) }), { params: { id: review.id } as any })

    const resReopen = await reopen(new Request('http://local/api/reviews/x/reopen', { method: 'POST', headers }), { params: { id: review.id } as any })
    expect(resReopen.ok).toBe(true)
    const reopened = (await resReopen.json() as any).data
    expect(reopened.status).toBe('IN_PROGRESS')
  })
})
