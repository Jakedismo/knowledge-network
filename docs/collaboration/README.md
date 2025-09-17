## Collaboration Backend (Phase 2B)

Quick start for FE → WS integration during Phase 2B.

- REST: `POST /api/collab/ws-token` with `{ knowledgeId }` and `Authorization: Bearer <access>`
- Response: `{ url, token, expiresAt, roomId }`, pass to `WebSocketCollaborationProvider`
- Env: `NEXT_PUBLIC_COLLAB_WS_URL` (e.g., `ws://localhost:8080/collab`), optional `COLLAB_ENABLED=1`
- Secrets: `JWT_SECRET` used for WS token signing (falls back to test secret in dev)

Client helper: `src/lib/editor/collaboration/get-ws-token.ts`.

DB: Prisma schema extended with `CollaborationSession.clientVersion`, `CollaborationUpdate.transport`, and composite index `(knowledgeId, isActive)`.

Monitoring: see `src/lib/observability/otel.ts` and metrics list in `docs/collaboration/2B-architecture.md`.

