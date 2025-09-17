export type Id = string

export type ReviewStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'

export type DecisionType = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'

export type AssigneeType = 'USER' | 'ROLE'
export type WorkflowStepType = 'SINGLE_APPROVAL' | 'MULTI_APPROVAL' | 'ANY_OF' | 'ALL_OF' | 'FYI'
export type AssigneeState = 'PENDING' | 'NOTIFIED' | 'ACCEPTED' | 'DELEGATED' | 'COMPLETED' | 'EXPIRED'
export type EscalationAction = 'NOTIFY' | 'REASSIGN' | 'AUTO_APPROVE' | 'AUTO_REJECT'

export interface ReviewWorkflow {
  id: Id
  workspaceId: Id
  name: string
  description?: string | null
  version: number
  isActive: boolean
  config?: Record<string, unknown>
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  id: Id
  workflowId: Id
  index: number
  type: WorkflowStepType
  name: string
  description?: string | null
  requiredApprovals: number
  slaHours?: number | null
  metadata?: Record<string, unknown>
  assignees: WorkflowStepAssignee[]
  escalations?: EscalationPolicy[]
}

export interface WorkflowStepAssignee {
  id: Id
  stepId: Id
  assigneeType: AssigneeType
  assigneeId: Id
  minApprovals?: number | null
}

export interface EscalationPolicy {
  id: Id
  stepId: Id
  afterHours: number
  action: EscalationAction
  toType?: AssigneeType | null
  toId?: Id | null
  notify?: string[]
  metadata?: Record<string, unknown>
}

export interface ReviewRequest {
  id: Id
  workspaceId: Id
  knowledgeId: Id
  workflowId: Id
  initiatorId: Id
  status: ReviewStatus
  currentStep: number
  dueAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ApprovalDecision {
  id: Id
  requestId: Id
  stepIndex: number
  reviewerId: Id
  decision: DecisionType
  comment?: string | null
  createdAt: Date
}

export interface ReviewAssignee {
  id: Id
  requestId: Id
  stepIndex: number
  assigneeType: AssigneeType
  assigneeId: Id
  state: AssigneeState
  delegatedToId?: Id | null
  notifiedAt?: Date | null
  actedAt?: Date | null
}

export interface ReviewChangeRequest {
  id: Id
  requestId: Id
  versionFromId: Id
  versionToId: Id
  summary?: string | null
  status: 'OPEN' | 'ADDRESSED' | 'CLOSED'
  createdAt: Date
}

export interface ReviewEvent {
  id: Id
  requestId: Id
  actorId?: Id | null
  type: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

// API DTOs
export interface CreateWorkflowInput {
  workspaceId: Id
  name: string
  description?: string | null
  steps: Array<{
    index: number
    type: WorkflowStepType
    name: string
    description?: string | null
    requiredApprovals?: number
    slaHours?: number | null
    assignees: Array<{ assigneeType: AssigneeType; assigneeId: Id; minApprovals?: number | null }>
  }>
  config?: Record<string, unknown>
}

export interface StartReviewInput {
  knowledgeId: Id
  workflowId: Id
}

export interface DecisionInput {
  decision: DecisionType
  comment?: string
}

export interface ChangeRequestInput {
  versionFromId: Id
  versionToId: Id
  summary?: string
}

export interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged'
  value: string
}

export interface DiffResult {
  fromVersionId: Id
  toVersionId: Id
  chunks: DiffChunk[]
}

