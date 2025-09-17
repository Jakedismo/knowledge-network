# Realtime Runbook

## Start Locally

- Configure `.env` (optional):
  - `COLLAB_PORT=3005`
  - `COLLAB_WS_PATH=/ws`
  - `JWT_SECRET=your-dev-secret` (optional)
  - `NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:3005/ws`
- Run server (Bun native): `bun run realtime`
- Run server (Elysia wrapper):
  - Install when allowed: `bun add elysia @elysiajs/ws`
  - Start: `bun run realtime:elysia`

## Health

- `GET http://localhost:3005/health` ⇒ `200 ok`

## Client Wiring

- The app’s editor hook `useCollaboration` will use `NEXT_PUBLIC_COLLAB_WS_URL` when `transport: 'websocket'`.
  - Example: `<Editor transport="websocket" roomId="doc-123" />`

## Storage

- Snapshots saved under `data/collab/<roomId>/*.bin` with sidecar JSON meta.
- Cleanup policy: rotate externally or extend `VersionStore` with TTL in Phase 3.

## Troubleshooting

- Ghost cursors: ensure disconnect cleanup runs; if needed, refresh room by restarting server during development.
- Latency spikes: verify local CPU saturation; avoid debug logging inside hot paths.
