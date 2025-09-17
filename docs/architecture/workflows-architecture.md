# Review & Approval Workflows — Architecture (Swarm 3D)

Scope: customizable review workflows, approval chains, change requests, escalation/routing, assignment/delegation, audit/compliance.

## Data Model (Prisma)
- ReviewWorkflow(workspaceId, name, version, isActive, config)
- WorkflowStep(workflowId, index, type, requiredApprovals, slaHours)
- WorkflowStepAssignee(stepId, assigneeType: USER|ROLE, assigneeId, minApprovals?)
- EscalationPolicy(stepId, afterHours, action, toType?, toId?, notify[])
- ReviewRequest(workspaceId, knowledgeId, workflowId, initiatorId, status, currentStep)
- ReviewAssignee(requestId, stepIndex, assigneeType, assigneeId, state, delegatedToId?)
- ApprovalDecision(requestId, stepIndex, reviewerId, decision, comment)
- ReviewChangeRequest(requestId, versionFromId, versionToId, summary, status)
- ReviewEvent(requestId, actorId?, type, metadata)

See `prisma/schema.prisma` for full definitions.

## Engine
- Engine is implemented as `WorkflowService` with a pluggable repository; current default is in-memory for tests, Prisma adaptercomes in Phase 3 integration.
- Step evaluation: REJECT ⇒ terminal; REQUEST_CHANGES ⇒ terminal (until re-open); APPROVE counts toward `requiredApprovals` ⇒ advance.
- Assignment seeding per step based on `WorkflowStepAssignee`.
- Escalation: poll trigger endpoint marks stale assignments EXPIRED; policy hooks left for integrations (notifications, reassign).

## Security & Permissions
- Actions use ACL via `requireAccess(...)` with:
  - `workflow:manage` (manage workflows, run escalations)
  - `review:start` (start review)
  - `review:decide` (approve/reject/request changes)

## API Surface (Next.js Route Handlers)
- `GET/POST /api/workflows` — list/create workflow (workspace scoped)
- `POST /api/workflows/:id/start` — start review for a knowledge id
- `POST /api/reviews/:id/decide` — record decision
- `POST /api/reviews/:id/request-changes` — create change request
- `POST /api/reviews/escalate` — run escalation loop (manual trigger)

## Diffing
- Line-based textual diff utility in service for summaries; can swap with richer diff later.

## Auditing
- All key actions emit `ReviewEvent` entries; ActivityLog remains for cross-feature analytics.

## Future Hooks
- Notifications (email/slack), delegation UX, reopen after changes, richer diff, Prisma adapter, scheduled escalations.

