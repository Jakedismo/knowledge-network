# Collaboration Infrastructure — Phase 2B (Backend TS Architect)

Date: 2025-09-17

## Scope

This document specifies the TypeScript-facing API, database schema evolution, GraphQL operations, Python WebSocket service integration, performance/caching, and monitoring/logging for real-time collaboration. It aligns with docs/editor/*, websocket-authentication.md, and prisma/schema.prisma.

## Objectives

- Deterministic, typed API surface for collaboration flows
- Yjs-compatible transport with Python WS service (lead: mfodpv0o-nopz8)
- Version history, snapshots, and presence persistence
- Sub-100ms perceived sync; <50ms CRDT apply p95
- Observability-first: metrics, traces, structured logs

---

## 1) TypeScript API Design (REST + GraphQL)

### REST Endpoints (Next.js App Router)

- `POST /api/collab/ws-token`
  - Request: `{ knowledgeId: string }`
  - Auth: Bearer access token (JWTService)
  - Response: `{ url: string; token: string; expiresAt: string; roomId: string }`
  - Behavior: Mints short-lived WS token (5m) for Python WS; includes claims: `sub, workspaceId, knowledgeId, roles, sessionId, iat, exp, nonce`.
  - Security: Audience=`collab-ws`, issuer=`web-app`, HMAC HS256 by default (rotate to asymmetric when WS supports JWKS).

- `POST /api/collab/snapshot`
  - Request: `{ knowledgeId: string; reason?: 'SCHEDULED'|'USER_REQUEST'|'RECOVERY' }`
  - Response: `{ snapshotId: string; version: number }`
  - Server: Persists Yjs state (provided by WS callback webhook later) or current contentDelta; writes `CollaborationSnapshot`.

- `POST /api/collab/presence`
  - Request: `{ knowledgeId: string; state: Record<string, unknown> }`
  - Response: `{ ok: true }`
  - Server: Upserts `CollaborationPresence` with short TTL semantics.

Note: The snapshot/presence endpoints are optional if WS posts directly via internal webhook. We keep them to unblock FE during WS service bring-up.

### GraphQL Additions (client docs)

- `mutation GetCollaborationWsToken(knowledgeId: ID!): CollaborationWsToken!`
- `type CollaborationWsToken { url: String!, token: String!, expiresAt: DateTime!, roomId: ID! }`
- Subscriptions already defined in `src/lib/graphql/subscriptions.ts` remain source of truth for non-CRDT events (comments, activity). CRDT deltas flow via WS.

See code changes under `src/lib/graphql/mutations.ts` and `src/lib/graphql/schema.ts` additions.

---

## 2) Database Schema Evolution

Prisma models already include:
- `CollaborationSession`, `CollaborationUpdate`, `CollaborationSnapshot`, `CollaborationPresence`.

Additions (Prisma schema updated):
- Indexes for hot paths:
  - `CollaborationUpdate(knowledgeId, createdAt DESC)` (present)
  - `CollaborationPresence(expiresAt)` (present)
  - NEW: `CollaborationSession(knowledgeId, isActive)` composite
- Columns:
  - NEW: `CollaborationSession.clientVersion String?` — telemetry of client adapter version
  - NEW: `CollaborationUpdate.transport String @default("ws")` — for analytics (`'ws'|'http'|'replay'`)

Rationale: Fast lookups for active sessions per doc; attribute transport for perf dashboards.

Migration plan:
- Create non-blocking indexes concurrently.
- Backfill `transport='ws'` for existing rows.
- Optional: Drop after validation if unused.

---

## 3) GraphQL: Mutations & Subscriptions

- `startCollaboration(knowledgeId)` and `endCollaboration(knowledgeId)` exist in schema docs. We add:
  - `getCollaborationWsToken(knowledgeId)` returning `CollaborationWsToken` (document-only; implemented via REST initially).
  - `updateCollaborationPresence(knowledgeId, state: JSON!)` for awareness mirrors REST.

Subscriptions (unchanged):
- `collaborationEvent(knowledgeId)` for high-level events (locks, presence summaries). Heavy CRDT traffic stays on WS.

---

## 4) Python WS Integration Pattern

Message protocol (matches `WebSocketCollaborationProvider`):
- Client → WS:
  - `{ type: 'sync'|'update', roomId, update: number[] }` — Yjs updates
  - `{ type: 'awareness', roomId, payload: number[] }`
- WS → Client:
  - Same shapes, `type: 'sync'|'update'|'awareness'`

Handshake:
1. FE calls `/api/collab/ws-token` with `knowledgeId`.
2. FE connects to `wss://<WS_HOST>/collab?token=...`.
3. WS validates token (audience=`collab-ws`, scope includes `edit:knowledge:{knowledgeId}`), joins room `kn:<knowledgeId>`.
4. Upon `open`, FE sends `sync` with full Yjs state.

Reconnection/backoff: handled by `WebSocketCollaborationProvider` with exponential backoff and status callbacks.

Security:
- Short-lived WS token (300s) bound to `sessionId`, `knowledgeId`, and `workspaceId`.
- Optional per-message HMAC at WS layer out-of-scope here.

---

## 5) Performance & Caching

Targets:
- p95 WS round-trip < 100ms
- p95 CRDT apply < 50ms
- 100 concurrent editors / doc baseline

Strategies:
- Client bundling of Yjs updates (20ms micro-batch) before `update` send
- Presence debouncing (100–250ms)
- Server-side Redis channel fanout and per-room rate limiting
- DB: async persistence of `CollaborationUpdate` (bulk insert), snapshot every N updates or 60s
- Cache: Redis keys `collab:presence:<doc>`, `collab:snapshot:<doc>:latest`

---

## 6) Monitoring & Logging

- OpenTelemetry (OTLP) tracer/bootstrap in `src/lib/observability/otel.ts`
- Metrics (counter/gauge):
  - `collab.ws.connects` / `disconnects`
  - `collab.ws.rtt_ms` histogram
  - `collab.update.bytes` counter
  - `collab.presence.active_users` gauge per doc
- Logs: structured JSON with `docId, userId(hash), sessionId, event`
- Correlation: propagate `x-request-id` → WS token `ctx.requestId`

---

## Rollout Plan

1. Land TS types + REST token endpoint and client helper
2. Coordinate with Python WS to accept our JWT (aud=`collab-ws`)
3. Gate by env var `NEXT_PUBLIC_COLLAB_WS_URL` and feature flag `COLLAB_ENABLED`
4. Enable snapshots/presence persistence; later move to WS webhooks

## Risks & Mitigations

- Token audience mismatch → align constants across services
- Overload from large updates → micro-batch, byte-size caps on WS side
- Clock skew → rely on WS iat/exp window tolerance (≤ 60s)

---

## Handoff

- FE: use `getCollabWsToken()` helper to connect provider
- BE (Python): validate claims, emit Yjs messages; optional webhook to persist updates

