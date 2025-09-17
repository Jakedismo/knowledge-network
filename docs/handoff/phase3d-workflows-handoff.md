#! Handoff — Swarm 3D: Review & Approval Workflows

## Summary
- Implemented workflow engine (`WorkflowService`) with in-memory repo (Prisma adapter planned next).
- Added Prisma schema for workflows, steps, assignees, escalations, requests, decisions, change requests, and audit events.
- Exposed API routes under `/api/workflows/*` and `/api/reviews/*` with ACL enforcement.
- Unit tests (`src/test/workflows.spec.ts`) cover core flows: start, approve/advance, changes, escalation.

## How to Run (local)
- Tests: `bunx vitest run src/test/workflows.spec.ts`
- API (dev): `bun run dev` then use routes with headers `x-user-id` and `x-workspace-id`.

## Constraints
- Project-wide strict TS errors exist from earlier phases (see QUALITY GATES). Workflows code passes isolated tests; full `tsc` currently fails due to unrelated modules.

## Next Steps
- Add Prisma-backed repository for `WorkflowService` and end-to-end tests.
- Integrate notifications + delegation UI flows.
- Wire scheduler/cron for escalations.
- Add reopen-after-changes flow upon new KnowledgeVersion.

## Contacts
- backend-typescript-architect: review Prisma adapter & API contracts
- frontend-ui-engineer: plan assignment/delegation UIs (no real-time UI scope here)

