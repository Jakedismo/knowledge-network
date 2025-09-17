// Prisma-backed workflow service (skeleton). Uses the same public API as WorkflowService.
// Note: In this repository, @prisma/client is stubbed for build/test convenience.
// This implementation guards itself to avoid runtime use unless WORKFLOWS_REPO=prisma is set
// in an environment with a real Prisma client and database.

import type {
  ApprovalDecision,
  ChangeRequestInput,
  CreateWorkflowInput,
  DecisionInput,
  DiffResult,
  ReviewAssignee,
  ReviewEvent,
  ReviewRequest,
  ReviewStatus,
  ReviewWorkflow,
} from './types'

export class DbWorkflowService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly prisma: any
  private readonly clock: () => Date

  constructor(opts?: { prisma?: unknown; clock?: () => Date }) {
    // Lazy import to play nice with stubbed prisma in this repo
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { prisma } = require('@/lib/db/prisma') as { prisma: unknown }
    this.prisma = opts?.prisma ?? prisma
    this.clock = opts?.clock ?? (() => new Date())
  }

  // API parity with WorkflowService; implementation assumes real Prisma models present
  async createWorkflow(input: CreateWorkflowInput): Promise<ReviewWorkflow> {
    this.ensure()
    const wf = await this.prisma.reviewWorkflow.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        version: 1,
        isActive: true,
        config: input.config ?? {},
        steps: {
          create: input.steps
            .sort((a, b) => a.index - b.index)
            .map((s) => ({
              index: s.index,
              type: s.type,
              name: s.name,
              description: s.description ?? null,
              requiredApprovals: s.requiredApprovals ?? 1,
              slaHours: s.slaHours ?? null,
              metadata: {},
              assignees: { create: s.assignees.map((a) => ({ assigneeType: a.assigneeType, assigneeId: a.assigneeId, minApprovals: a.minApprovals ?? null })) },
            })),
        },
      },
      include: { steps: { include: { assignees: true, escalations: true } } },
    })
    return wf
  }
  async listWorkflows(workspaceId: string): Promise<ReviewWorkflow[]> {
    this.ensure()
    return this.prisma.reviewWorkflow.findMany({ where: { workspaceId, isActive: true }, include: { steps: { include: { assignees: true, escalations: true } } } })
  }
  async getWorkflow(id: string): Promise<ReviewWorkflow | undefined> {
    this.ensure()
    const wf = await this.prisma.reviewWorkflow.findUnique({ where: { id }, include: { steps: { include: { assignees: true, escalations: true } } } })
    return wf ?? undefined
  }
  async startReview(params: { workspaceId: string; knowledgeId: string; workflowId: string; initiatorId: string }): Promise<ReviewRequest> {
    this.ensure()
    const now = this.clock()
    const req = await this.prisma.reviewRequest.create({
      data: {
        workspaceId: params.workspaceId,
        knowledgeId: params.knowledgeId,
        workflowId: params.workflowId,
        initiatorId: params.initiatorId,
        status: 'PENDING',
        currentStep: 0,
        createdAt: now,
        updatedAt: now,
      },
    })
    const wf = await this.getWorkflow(params.workflowId)
    if (wf) await this.seedAssignmentsForStep(req.id, wf, 0)
    return req
  }
  async listAssignments(requestId: string, stepIndex?: number): Promise<ReviewAssignee[]> {
    this.ensure()
    return this.prisma.reviewAssignee.findMany({ where: { requestId, ...(stepIndex !== undefined ? { stepIndex } : {}) } })
  }
  async recordDecision(requestId: string, reviewerId: string, input: DecisionInput): Promise<{ status: ReviewStatus; advanced: boolean }> {
    this.ensure()
    const req = await this.prisma.reviewRequest.findUnique({ where: { id: requestId } })
    if (!req) throw new Error('Review request not found')
    const wf = await this.getWorkflow(req.workflowId)
    if (!wf) throw new Error('Workflow not found')
    const now = this.clock()
    await this.prisma.approvalDecision.create({ data: { requestId, stepIndex: req.currentStep, reviewerId, decision: input.decision, comment: input.comment ?? null, createdAt: now } })
    if (input.decision === 'REJECT') {
      await this.prisma.reviewRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', updatedAt: now } })
      return { status: 'REJECTED', advanced: false }
    }
    if (input.decision === 'REQUEST_CHANGES') {
      await this.prisma.reviewRequest.update({ where: { id: requestId }, data: { status: 'CHANGES_REQUESTED', updatedAt: now } })
      return { status: 'CHANGES_REQUESTED', advanced: false }
    }
    const approvals = await this.prisma.approvalDecision.count({ where: { requestId, stepIndex: req.currentStep, decision: 'APPROVE' } })
    const step = wf.steps.find((s: any) => s.index === req.currentStep)
    const needed = step?.requiredApprovals ?? 1
    if (approvals >= needed) {
      const maxIndex = Math.max(...wf.steps.map((s: any) => s.index))
      if (req.currentStep >= maxIndex) {
        await this.prisma.reviewRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', updatedAt: now } })
        return { status: 'APPROVED', advanced: false }
      } else {
        const next = req.currentStep + 1
        await this.prisma.reviewRequest.update({ where: { id: requestId }, data: { status: 'IN_PROGRESS', currentStep: next, updatedAt: now } })
        const wfFull = await this.getWorkflow(req.workflowId)
        if (wfFull) await this.seedAssignmentsForStep(requestId, wfFull, next)
        return { status: 'IN_PROGRESS', advanced: true }
      }
    }
    await this.prisma.reviewRequest.update({ where: { id: requestId }, data: { status: 'IN_PROGRESS', updatedAt: now } })
    return { status: 'IN_PROGRESS', advanced: false }
  }
  async requestChanges(requestId: string, input: ChangeRequestInput): Promise<void> {
    this.ensure()
    const now = this.clock()
    await this.prisma.reviewChangeRequest.create({ data: { requestId, versionFromId: input.versionFromId, versionToId: input.versionToId, summary: input.summary ?? null, status: 'OPEN', createdAt: now } })
    await this.prisma.reviewRequest.update({ where: { id: requestId }, data: { status: 'CHANGES_REQUESTED', updatedAt: now } })
  }
  computeDiff(fromText: string, toText: string, fromVersionId: string, toVersionId: string): DiffResult {
    const a = fromText.split(/\r?\n/)
    const b = toText.split(/\r?\n/)
    const chunks: { type: 'added' | 'removed' | 'unchanged'; value: string }[] = []
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i += 1) {
      const av = a[i]
      const bv = b[i]
      if (av === undefined && bv !== undefined) chunks.push({ type: 'added', value: bv })
      else if (bv === undefined && av !== undefined) chunks.push({ type: 'removed', value: av })
      else if (av === bv) chunks.push({ type: 'unchanged', value: av })
      else {
        chunks.push({ type: 'removed', value: av as string })
        chunks.push({ type: 'added', value: bv as string })
      }
    }
    return { fromVersionId, toVersionId, chunks }
  }
  async runEscalations(): Promise<number> {
    this.ensure()
    // Minimal: mark PENDING assignments older than SLA as EXPIRED
    const open = await this.prisma.reviewRequest.findMany({ where: { OR: [{ status: 'PENDING' }, { status: 'IN_PROGRESS' }] } })
    let affected = 0
    for (const req of open) {
      const wf = await this.getWorkflow(req.workflowId)
      const step = wf?.steps.find((s: any) => s.index === req.currentStep)
      if (!step?.slaHours) continue
      const assignees: ReviewAssignee[] = await this.prisma.reviewAssignee.findMany({ where: { requestId: req.id, stepIndex: req.currentStep, state: 'PENDING' } })
      for (const a of assignees) {
        const notifiedAt = a.notifiedAt ? new Date(a.notifiedAt) : null
        if (!notifiedAt) continue
        const deadline = new Date(notifiedAt.getTime() + step.slaHours * 3600 * 1000)
        if (this.clock() > deadline) {
          // mark expired
          await this.prisma.reviewAssignee.update({ where: { id: a.id }, data: { state: 'EXPIRED' } })
          affected += 1
        }
      }
    }
    return affected
  }
  private async seedAssignmentsForStep(requestId: string, wf: ReviewWorkflow, stepIndex: number) {
    const step = (wf as any).steps.find((s: any) => s.index === stepIndex)
    if (!step) return
    const now = this.clock()
    await this.prisma.reviewAssignee.createMany({
      data: step.assignees.map((a: any) => ({
        requestId,
        stepIndex,
        assigneeType: a.assigneeType,
        assigneeId: a.assigneeId,
        state: 'PENDING',
        delegatedToId: null,
        notifiedAt: now,
      })),
    })
  }
  private ensure() {
    if (!this.prisma?.reviewWorkflow) throw this.notAvailable()
  }
  private notAvailable(): Error {
    return new Error('DbWorkflowService requires a real Prisma client. In this workspace, use default in-memory WorkflowService or run with a real DB.')
  }
}
