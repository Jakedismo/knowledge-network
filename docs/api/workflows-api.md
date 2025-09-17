# Workflows API

All endpoints require auth headers used across the app and use `requireAccess` to enforce permissions.

Headers:
- `Authorization: Bearer <jwt>` or `x-user-id`
- `x-workspace-id: <workspace>`

## List/Create Workflows
- GET `/api/workflows` → `{ data: ReviewWorkflow[] }`
- POST `/api/workflows`
  Body: `CreateWorkflowInput` (without `workspaceId`)
  → `{ data: ReviewWorkflow }`

## Start Review
- POST `/api/workflows/:id/start`
  Body: `{ knowledgeId: string }`
  → `{ data: ReviewRequest }`

## Record Decision
- POST `/api/reviews/:id/decide`
  Body: `{ decision: 'APPROVE'|'REJECT'|'REQUEST_CHANGES', comment?: string }`
  → `{ data: { status: ReviewStatus, advanced: boolean } }`

## Request Changes
- POST `/api/reviews/:id/request-changes`
  Body: `{ versionFromId: string, versionToId: string, summary?: string }`
  → `{ ok: true }`

## Reopen Review
- POST `/api/reviews/:id/reopen`
  Body: empty
  → `{ data: ReviewRequest }` (moves CHANGES_REQUESTED/REJECTED back to IN_PROGRESS and re-seeds current step assignments)

## Escalation Trigger
- POST `/api/reviews/escalate` → `{ escalated: number }`

Types live in `src/server/modules/workflows/types.ts`.
