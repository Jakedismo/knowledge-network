#! Workflows Prisma Adapter (Plan)

This outlines the repository interface and mapping to Prisma models introduced in `prisma/schema.prisma`. The default runtime uses the in-memory implementation in `WorkflowService`. The Prisma-backed repo will be feature-gated by `WORKFLOWS_REPO=prisma`.

## Repository Contract (high-level)
- createWorkflow(input) → ReviewWorkflow
- listWorkflows(workspaceId) → ReviewWorkflow[]
- getWorkflow(id) → ReviewWorkflow
- createRequest({ workspaceId, knowledgeId, workflowId, initiatorId }) → ReviewRequest
- listAssignments(requestId, stepIndex?) → ReviewAssignee[]
- addDecision({ requestId, stepIndex, reviewerId, decision, comment? })
- updateRequest({ id, status, currentStep? })
- addChange({ requestId, versionFromId, versionToId, summary? })
- addEvent({ requestId, type, metadata })

## Mapping
- ReviewWorkflow ↔ review_workflows
- WorkflowStep ↔ workflow_steps
- WorkflowStepAssignee ↔ workflow_step_assignees
- EscalationPolicy ↔ escalation_policies
- ReviewRequest ↔ review_requests
- ReviewAssignee ↔ review_assignees
- ApprovalDecision ↔ approval_decisions
- ReviewChangeRequest ↔ review_change_requests
- ReviewEvent ↔ review_events

## Next Implementation Steps
1. Add `PrismaWorkflowRepo` in `src/server/modules/workflows/prisma.repo.ts` using `@prisma/client`.
2. Extend `WorkflowService` to accept a repo implementing the contract. (Constructor already supports `repo`.)
3. Environment switch: `WORKFLOWS_REPO=prisma` will wire the Prisma repo in API handlers.
4. Add E2E test variant (integration) behind `TEST_PRISMA=1` with a dockerized Postgres or sqlite.

## Notes
- Keep transactions when seeding steps and assignees.
- Indexes in schema support common queries (requestId, workspaceId, status).
- Use `updatedAt` semantics from Prisma for request state transitions.

