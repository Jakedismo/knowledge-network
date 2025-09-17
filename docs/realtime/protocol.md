# WebSocket Protocol

Client and server exchange messages over two compatible routes:

- Simple JSON route (default): `ws://localhost:3005/ws` matching `websocket-provider.ts`.
- JSON-RPC route (MCP): `ws://localhost:3005/collab/ws` matching `mcp-ws-provider.ts`.

Simple JSON messages:

- `sync`: Initial or on-demand full Yjs state sync.
  - `{ type: "sync", roomId: string, update: number[] }`
- `update`: Incremental Yjs state update.
  - `{ type: "update", roomId: string, update: number[] }`
- `awareness`: Presence updates (cursors, names, colors) via y-protocols awareness.
  - `{ type: "awareness", roomId: string, payload: number[] }`

Notes:
- `update`/`sync` arrays encode `Uint8Array` produced by `Y.encodeStateAsUpdate`.
- Server broadcasts `update` to all room peers except the sender.
- Server fans out `awareness` updates to all peers; on disconnect, server removes any awareness states observed from that connection.

Auth:
- If `JWT_SECRET` is set, clients must include `?token=<jwt>` in the WS URL.
- `roomId` is required as `?roomId=<id>`.

JSON-RPC (MCP) methods (text frames with `jsonrpc: "2.0"`):
- `collab/subscribe({ roomId, token? }) -> { ok: true }`
- `collab/sync({ roomId, payloadB64 }) -> { applied: true, version }`
- `collab/update({ roomId, payloadB64 }) -> { applied: true, version }`
- `collab/awareness({ roomId, payloadB64 }) -> { ok: true }`
- `collab/heartbeat({ ts }) -> { ts, serverTs }`
- `collab/room.info({ roomId }) -> { roomId, participants }`

HTTP endpoints:
- `GET /history/:roomId?limit=20` -> version metadata list
- `GET /history/:roomId/latest` -> `{ ok, meta, dataB64 }`
- `GET /history/:roomId/:version` -> `{ ok, meta, dataB64 }` for specific version id
- `GET /room/:roomId/info` -> `{ roomId, inMemory, participants, docClock, awareness }`
- `GET /metrics` -> Prometheus text exposition

Auth headers:
- Alternatively to the `token` query param, send `Authorization: Bearer <token>` during WS upgrade. The MCP JSON‑RPC route also accepts `token` in `collab/subscribe` params.
