import { randomUUID } from 'crypto'
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
  WorkflowStep,
  WorkflowStepAssignee,
} from './types'

type Clock = () => Date

// In-memory repository for initial integration and tests. Replace with Prisma-backed repo later.
class InMemoryRepo {
  workflows = new Map<string, ReviewWorkflow>()
  steps = new Map<string, WorkflowStep>()
  stepAssignees = new Map<string, WorkflowStepAssignee>()
  requests = new Map<string, ReviewRequest>()
  decisions = new Map<string, ApprovalDecision>()
  assignments = new Map<string, ReviewAssignee>()
  events = new Map<string, ReviewEvent>()
  changes = new Map<string, { id: string; requestId: string; versionFromId: string; versionToId: string; summary?: string | null; status: 'OPEN' | 'ADDRESSED' | 'CLOSED'; createdAt: Date }>()
}

import { NullNotificationPublisher, type NotificationPublisher } from './notifications'

export class WorkflowService {
  private readonly repo: InMemoryRepo
  private readonly clock: Clock
  private readonly notifier: NotificationPublisher

  constructor(opts?: { repo?: InMemoryRepo; clock?: Clock; notifier?: NotificationPublisher }) {
    this.repo = opts?.repo ?? new InMemoryRepo()
    this.clock = opts?.clock ?? (() => new Date())
    this.notifier = opts?.notifier ?? new NullNotificationPublisher()
  }

  // ---------- Workflow CRUD ----------
  async createWorkflow(input: CreateWorkflowInput): Promise<ReviewWorkflow> {
    const id = randomUUID()
    const now = this.clock()
    const wf: ReviewWorkflow = {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      version: 1,
      isActive: true,
      config: input.config ?? {},
      steps: [],
    }
    this.repo.workflows.set(id, wf)

    for (const stepInput of input.steps.sort((a, b) => a.index - b.index)) {
      const stepId = randomUUID()
      const step: WorkflowStep = {
        id: stepId,
        workflowId: id,
        index: stepInput.index,
        type: stepInput.type,
        name: stepInput.name,
        description: stepInput.description ?? null,
        requiredApprovals: stepInput.requiredApprovals ?? 1,
        slaHours: stepInput.slaHours ?? null,
        metadata: {},
        assignees: [],
        escalations: [],
      }
      this.repo.steps.set(stepId, step)
      wf.steps.push(step)
      for (const a of stepInput.assignees) {
        const aid = randomUUID()
        const assignee: WorkflowStepAssignee = {
          id: aid,
          stepId,
          assigneeType: a.assigneeType,
          assigneeId: a.assigneeId,
          minApprovals: a.minApprovals ?? null,
        }
        this.repo.stepAssignees.set(aid, assignee)
        step.assignees.push(assignee)
      }
    }
    // Emit audit: workflow.created
    this.addEvent({ type: 'workflow.created', metadata: { workflowId: id, at: now.toISOString() } })
    return wf
  }

  async listWorkflows(workspaceId: string): Promise<ReviewWorkflow[]> {
    return [...this.repo.workflows.values()].filter((w) => w.workspaceId === workspaceId)
  }

  async getWorkflow(id: string): Promise<ReviewWorkflow | undefined> {
    return this.repo.workflows.get(id)
  }

  // ---------- Review Requests ----------
  async startReview(params: {
    workspaceId: string
    knowledgeId: string
    workflowId: string
    initiatorId: string
  }): Promise<ReviewRequest> {
    const wf = await this.getWorkflow(params.workflowId)
    if (!wf || wf.workspaceId !== params.workspaceId) {
      throw new Error('Workflow not found in workspace')
    }
    const now = this.clock()
    const id = randomUUID()
    const req: ReviewRequest = {
      id,
      workspaceId: params.workspaceId,
      knowledgeId: params.knowledgeId,
      workflowId: params.workflowId,
      initiatorId: params.initiatorId,
      status: 'PENDING',
      currentStep: 0,
      createdAt: now,
      updatedAt: now,
      dueAt: null,
    }
    this.repo.requests.set(id, req)
    this.addEvent({ type: 'review.started', metadata: { requestId: id, workflowId: wf.id } })
    await this.seedAssignmentsForStep(req, wf, 0)
    return req
  }

  private async seedAssignmentsForStep(req: ReviewRequest, wf: ReviewWorkflow, stepIndex: number) {
    const step = wf.steps.find((s) => s.index === stepIndex)
    if (!step) return
    const now = this.clock()
    for (const a of step.assignees) {
      const id = randomUUID()
      const ra: ReviewAssignee = {
        id,
        requestId: req.id,
        stepIndex,
        assigneeType: a.assigneeType,
        assigneeId: a.assigneeId,
        state: 'PENDING',
        delegatedToId: null,
        notifiedAt: now,
        actedAt: null,
      }
      this.repo.assignments.set(id, ra)
    }
    this.addEvent({ type: 'step.assigned', metadata: { requestId: req.id, stepIndex } })
    // Notify each explicit user assignee (skip roles at this layer)
    await Promise.all(
      (await this.listAssignments(req.id, stepIndex))
        .filter((a) => a.assigneeType === 'USER')
        .map((a) => this.notifier.stepAssigned({ requestId: req.id, stepIndex, assigneeId: a.assigneeId, assigneeType: 'USER' }))
    )
  }

  async getRequest(id: string): Promise<ReviewRequest | undefined> {
    return this.repo.requests.get(id)
  }

  async listAssignments(requestId: string, stepIndex?: number): Promise<ReviewAssignee[]> {
    const all = [...this.repo.assignments.values()].filter((a) => a.requestId === requestId)
    return stepIndex === undefined ? all : all.filter((a) => a.stepIndex === stepIndex)
  }

  async recordDecision(requestId: string, reviewerId: string, input: DecisionInput): Promise<{ status: ReviewStatus; advanced: boolean }>
  {
    const req = await this.getRequest(requestId)
    if (!req) throw new Error('Review request not found')
    const wf = await this.getWorkflow(req.workflowId)
    if (!wf) throw new Error('Workflow not found')

    const now = this.clock()
    const decId = randomUUID()
    const decision: ApprovalDecision = {
      id: decId,
      requestId,
      stepIndex: req.currentStep,
      reviewerId,
      decision: input.decision,
      comment: input.comment ?? null,
      createdAt: now,
    }
    this.repo.decisions.set(decId, decision)
    this.addEvent({ type: 'decision.recorded', metadata: { requestId, step: req.currentStep, reviewerId, decision: input.decision } })

    // Mark assignment as completed for this reviewer if present
    for (const a of await this.listAssignments(requestId, req.currentStep)) {
      if (a.assigneeId === reviewerId && a.assigneeType === 'USER') {
        a.state = 'COMPLETED'
        a.actedAt = now
      }
    }

    // Evaluate step completion
    const step = wf.steps.find((s) => s.index === req.currentStep)
    if (!step) throw new Error('Invalid workflow step')

    const decisionsForStep = [...this.repo.decisions.values()].filter((d) => d.requestId === requestId && d.stepIndex === req.currentStep)

    // For simplicity: requiredApprovals of APPROVE needed; REJECT immediately rejects; REQUEST_CHANGES sets status and stops
    if (input.decision === 'REJECT') {
      req.status = 'REJECTED'
      req.updatedAt = now
      this.addEvent({ type: 'review.rejected', metadata: { requestId, step: req.currentStep } })
      return { status: req.status, advanced: false }
    }
    if (input.decision === 'REQUEST_CHANGES') {
      req.status = 'CHANGES_REQUESTED'
      req.updatedAt = now
      this.addEvent({ type: 'review.changes_requested', metadata: { requestId, step: req.currentStep } })
      return { status: req.status, advanced: false }
    }

    const approvals = decisionsForStep.filter((d) => d.decision === 'APPROVE').length
    const needed = step.requiredApprovals > 0 ? step.requiredApprovals : 1
    if (approvals >= needed) {
      // advance to next step or approve
      const maxIndex = Math.max(...wf.steps.map((s) => s.index))
      if (req.currentStep >= maxIndex) {
        req.status = 'APPROVED'
        req.updatedAt = now
        this.addEvent({ type: 'review.approved', metadata: { requestId } })
        return { status: req.status, advanced: false }
      } else {
        req.currentStep += 1
        req.status = 'IN_PROGRESS'
        req.updatedAt = now
        await this.seedAssignmentsForStep(req, wf, req.currentStep)
        this.addEvent({ type: 'step.advanced', metadata: { requestId, step: req.currentStep } })
        return { status: req.status, advanced: true }
      }
    }

    // Not enough approvals yet
    req.status = 'IN_PROGRESS'
    req.updatedAt = now
    return { status: req.status, advanced: false }
  }

  async requestChanges(requestId: string, input: ChangeRequestInput): Promise<void> {
    const req = await this.getRequest(requestId)
    if (!req) throw new Error('Review request not found')
    const id = randomUUID()
    const now = this.clock()
    this.repo.changes.set(id, {
      id,
      requestId,
      versionFromId: input.versionFromId,
      versionToId: input.versionToId,
      summary: input.summary ?? null,
      status: 'OPEN',
      createdAt: now,
    })
    req.status = 'CHANGES_REQUESTED'
    req.updatedAt = now
    this.addEvent({ type: 'change.requested', metadata: { requestId, from: input.versionFromId, to: input.versionToId } })
  }

  async reopen(requestId: string): Promise<ReviewRequest> {
    const req = await this.getRequest(requestId)
    if (!req) throw new Error('Review request not found')
    if (req.status !== 'CHANGES_REQUESTED' && req.status !== 'REJECTED') {
      return req
    }
    const wf = await this.getWorkflow(req.workflowId)
    if (!wf) throw new Error('Workflow not found')
    req.status = 'IN_PROGRESS'
    req.updatedAt = this.clock()
    await this.seedAssignmentsForStep(req, wf, req.currentStep)
    this.addEvent({ type: 'review.reopened', metadata: { requestId, step: req.currentStep } })
    return req
  }

  // ---------- Diff utilities (text line-based) ----------
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
        // naive: mark removal then addition
        chunks.push({ type: 'removed', value: av as string })
        chunks.push({ type: 'added', value: bv as string })
      }
    }
    return { fromVersionId, toVersionId, chunks }
  }

  // ---------- Escalation (poll-based trigger) ----------
  async runEscalations(now: Date = this.clock()): Promise<number> {
    let affected = 0
    // naive: mark NOTIFIED -> EXPIRED if SLA exceeded; emit events
    for (const req of this.repo.requests.values()) {
      const wf = await this.getWorkflow(req.workflowId)
      if (!wf) continue
      const step = wf.steps.find((s) => s.index === req.currentStep)
      if (!step || !step.slaHours) continue
      const assignments = await this.listAssignments(req.id, req.currentStep)
      for (const a of assignments) {
        if (a.state === 'PENDING' && a.notifiedAt) {
          const deadline = new Date(a.notifiedAt.getTime() + step.slaHours * 3600 * 1000)
          if (now > deadline) {
            a.state = 'EXPIRED'
            affected += 1
            this.addEvent({ type: 'escalation.triggered', metadata: { requestId: req.id, step: req.currentStep, assigneeId: a.assigneeId } })
            await this.notifier.escalationTriggered({ requestId: req.id, stepIndex: req.currentStep, assigneeId: a.assigneeId })
          }
        }
      }
    }
    return affected
  }

  // ---------- Audit helpers ----------
  private addEvent(e: { type: string; metadata?: Record<string, unknown> }) {
    const id = randomUUID()
    const ev: ReviewEvent = { id, requestId: e.metadata?.requestId as string | undefined ?? 'n/a', actorId: undefined, type: e.type, metadata: e.metadata, createdAt: this.clock() }
    this.repo.events.set(id, ev)
  }
}

export const workflowService = new WorkflowService()
