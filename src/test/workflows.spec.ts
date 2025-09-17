import { describe, it, expect, beforeEach } from 'vitest'
import { WorkflowService } from '@/server/modules/workflows/workflow.service'

const fixedNow = new Date('2025-09-17T12:00:00.000Z')

describe('WorkflowService', () => {
  let svc: WorkflowService
  beforeEach(() => {
    let now = fixedNow
    svc = new WorkflowService({ clock: () => now })
  })

  it('creates workflow and starts a review', async () => {
    const wf = await svc.createWorkflow({
      workspaceId: 'w1',
      name: 'Doc Review',
      steps: [
        {
          index: 0,
          type: 'SINGLE_APPROVAL',
          name: 'Peer Review',
          assignees: [{ assigneeType: 'USER', assigneeId: 'u2' }],
        },
        {
          index: 1,
          type: 'SINGLE_APPROVAL',
          name: 'Lead Approval',
          assignees: [{ assigneeType: 'USER', assigneeId: 'manager1' }],
        },
      ],
    })
    expect(wf.id).toBeDefined()
    expect(wf.steps.length).toBe(2)

    const req = await svc.startReview({ workspaceId: 'w1', knowledgeId: 'k1', workflowId: wf.id, initiatorId: 'u1' })
    expect(req.status).toBe('PENDING')
    const a0 = await svc.listAssignments(req.id, 0)
    expect(a0.length).toBe(1)
    expect(a0[0].assigneeId).toBe('u2')
  })

  it('advances steps on approvals and finalizes', async () => {
    const wf = await svc.createWorkflow({
      workspaceId: 'w1',
      name: 'Two Step',
      steps: [
        { index: 0, type: 'SINGLE_APPROVAL', name: 'Peer', assignees: [{ assigneeType: 'USER', assigneeId: 'peer' }] },
        { index: 1, type: 'SINGLE_APPROVAL', name: 'Lead', assignees: [{ assigneeType: 'USER', assigneeId: 'lead' }] },
      ],
    })
    const req = await svc.startReview({ workspaceId: 'w1', knowledgeId: 'k1', workflowId: wf.id, initiatorId: 'u1' })
    let res = await svc.recordDecision(req.id, 'peer', { decision: 'APPROVE' })
    expect(res.advanced).toBe(true)
    expect(res.status).toBe('IN_PROGRESS')
    res = await svc.recordDecision(req.id, 'lead', { decision: 'APPROVE' })
    expect(res.status).toBe('APPROVED')
  })

  it('supports change requests', async () => {
    const wf = await svc.createWorkflow({
      workspaceId: 'w1',
      name: 'ChangeReq',
      steps: [{ index: 0, type: 'SINGLE_APPROVAL', name: 'Review', assignees: [{ assigneeType: 'USER', assigneeId: 'r1' }] }],
    })
    const req = await svc.startReview({ workspaceId: 'w1', knowledgeId: 'k1', workflowId: wf.id, initiatorId: 'u1' })
    await svc.requestChanges(req.id, { versionFromId: 'v1', versionToId: 'v2', summary: 'Fix typos' })
    const updated = await svc.getRequest(req.id)
    expect(updated?.status).toBe('CHANGES_REQUESTED')
  })

  it('runs escalations on SLA breach', async () => {
    let now = new Date('2025-09-17T12:00:00.000Z')
    svc = new WorkflowService({ clock: () => now })
    const wf = await svc.createWorkflow({
      workspaceId: 'w1',
      name: 'SLA',
      steps: [{ index: 0, type: 'SINGLE_APPROVAL', name: 'SLA Step', slaHours: 1, assignees: [{ assigneeType: 'USER', assigneeId: 'r1' }] }],
    })
    const req = await svc.startReview({ workspaceId: 'w1', knowledgeId: 'k1', workflowId: wf.id, initiatorId: 'u1' })
    // Move time forward beyond SLA
    now = new Date('2025-09-17T14:10:00.000Z')
    const escalated = await svc.runEscalations(now)
    expect(escalated).toBeGreaterThanOrEqual(1)
  })
})

