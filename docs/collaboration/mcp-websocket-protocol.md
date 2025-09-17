# MCP over WebSocket — Real‑Time Collaboration Protocol

Date: 2025-09-17
Owners: mcp-protocol-expert, python-backend-api (mfodpv0o-nopz8)

## Scope
- Define an MCP-compatible, low-latency protocol for collaborative editing and presence over WebSocket.
- Optimize for Yjs CRDT updates and awareness signals with secure auth and scalable routing.
- Aligns with existing docs: `docs/mcp-authentication-architecture.md`, `docs/websocket-authentication.md`.

## Goals
- Sub-50ms median round-trip for keystroke echoes in LAN/dev, sub-150ms p95 WAN.
- Loss-tolerant, ordered application of CRDT updates; idempotent replays.
- Secure session-bound routing with RBAC and per-room permissions.
- Operable at scale with partitioned rooms and backpressure.

## Transport & Envelope
- Transport: WebSocket (wss in prod). Binary frames recommended for payloads; JSON is acceptable for control.
- Envelope: JSON-RPC 2.0 methods within MCP semantics.

```
// Control (JSON text frame)
{
  "jsonrpc": "2.0",
  "id": "<uuid|snowflake>",
  "method": "collab/subscribe",
  "params": {
    "roomId": "ws:<workspace>/<document>",
    "sessionId": "<mcp-session-id>",
    "token": "<jwt|wsToken>",
    "capabilities": ["yjs.update.v1", "awareness.v1"],
    "client": { "name": "kn-web", "version": "1.0.0" }
  }
}

// Data (binary or base64 in JSON) — see Messages
```

## Messages

All data messages carry ordering and replay metadata to guarantee idempotency.

Common metadata:
- `roomId: string` — logical routing key. Convention: `ws:<workspaceId>/<documentId>`.
- `seq: number` — per-connection monotonically increasing sequence.
- `ts: number` — ms since epoch for diagnostics; not for ordering.
- `sid: string` — server-assigned stream id for sharded rooms.

Types:
- `collab/update` — CRDT document update.
  - Payload: Yjs update bytes.
  - Ack: `result: { applied: true, version: <serverVersion> }`.
- `collab/awareness` — presence/selection updates.
  - Payload: Yjs awareness update bytes.
- `collab/sync` — initial sync; server may send `stateVector` prompt then full update.
- `collab/heartbeat` — ping/ack for liveness and RTT sampling.
- `collab/room.info` — participants, roles, rate-limit hints.

Example (JSON control + base64 payload for text transports):
```
{
  "jsonrpc": "2.0",
  "id": "94f9…",
  "method": "collab/update",
  "params": {
    "roomId": "ws:acme/42",
    "seq": 102,
    "sid": "A1",
    "payload": "base64:YjsUpdateBytes=="
  }
}
```

Servers should prefer binary frames with a 1‑byte type tag:
```
0x01 = update, 0x02 = awareness, 0x03 = sync, 0x10 = heartbeat
```

## Routing & Queuing
- Partition by `roomId` → shard key `hash(roomId) % N`. Within shard, per-room mailbox FIFO.
- Each connection maintains an outbox with bounded size (default 256). Apply backpressure when full.
- Optional fanout via pub/sub (e.g., Redis) using channel `room:<roomId>`.
- Server ACK on `collab/update` enables client-side resend on timeout (2x backoff up to 2s).

## Security
- Authenticate at connect using `mcp-session-id` + `Authorization: Bearer <token>` (see MCP auth doc).
- Authorize `roomId` access with RBAC (read/write/admin). Reject unauthorized `subscribe`/`update`.
- Enforce per-connection rate limits: messages/min (type-based), concurrent rooms, bytes/sec.
- Validate payload lengths; discard > max (default 32KB for updates, 8KB awareness).
- TLS required in production; origin allowlist; optional token binding to client fingerprint.

## Low-Latency Optimizations
- Encode Yjs updates directly to binary frames; avoid JSON array encoding of bytes.
- Batch tiny updates (<256B) within 10–15ms coalescing window during bursts.
- Use protocol-level seq + server `sid` for fast de-dup/ordering; idempotent `applyUpdate`.
- Prefer Nagle off (TCP_NODELAY) on server sockets; per-connection write buffer watermarking.

## Monitoring & Diagnostics
- Emit metrics: `collab.rtt_ms`, `collab.msg_in/out`, `collab.bytes_in/out`, `collab.backpressure_on`, `collab.dropped`, `collab.room_participants`, `collab.apply_duration_ms`.
- Structured logs include `roomId`, `seq`, `sid`, `connectionId`, `userId`, outcome.
- Tracing: propagate `traceparent` via MCP context header; include in server acks.
- Admin ops: `collab/room.info`, `collab/room.kick`, `collab/room.mute` (RBAC‑gated).

## Failure Handling
- Client resend window with exponential backoff up to 2s and jitter; drop after 3 attempts.
- Server can issue `error` with codes: `UNAUTH`, `FORBIDDEN`, `RATE_LIMIT`, `ROOM_NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `INTERNAL`.
- Graceful close codes: 1008 (policy), 1013 (try again), 1011 (server error).

## Compatibility Layer
- Existing `WebSocketCollaborationProvider` (JSON messages) remains supported in dev.
- New `MCPWebSocketCollaborationProvider` wraps Yjs updates in MCP JSON-RPC with optional binary frames.
- Feature switch via env: `NEXT_PUBLIC_COLLAB_TRANSPORT=mcp-ws`.

## Backend Notes (Python)
- Implement JSON-RPC method handlers: `collab/subscribe`, `collab/update`, `collab/awareness`, `collab/heartbeat`.
- Validate JWT, map to session/permissions, attach `connection.user`.
- Yjs server: apply updates and broadcast; consider `ypy-websocket` or custom adapter.
- Horizontal scale via Redis (pub/sub) for room fanout; sticky sessions by `roomId` hash.

## Acceptance Criteria
- Editor multi-peer typing: consistent convergence across 3+ clients.
- Presence updates sub-150ms p95.
- Backpressure visible under synthetic 10x burst without client crashes.
- Metrics exported and alerts defined for error rates and timeouts.

