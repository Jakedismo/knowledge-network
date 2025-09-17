# Realtime Collaboration Architecture (Swarm 2B)

This document summarizes the collaboration infrastructure added in Phase 2B.

## Overview

- Transport: Bun WebSocket server on `ws://localhost:3005/ws` (no external deps).
- CRDT: Yjs (`Y.Doc`, `Y.Text`) ensuring conflict-free merging and intention preservation.
- Presence: y-protocols `Awareness` with per-room server fan-out and disconnect cleanup.
- Autosave: Debounced snapshotting to `data/collab/<roomId>/timestamp.bin` with JSON metadata.
- Protocol: Minimal JSON messages (`sync`, `update`, `awareness`) matching the existing client provider.

## Components

- `src/realtime/server.ts`: Bun server + upgrade + basic JWT auth (optional via `JWT_SECRET`).
- `src/realtime/room.ts`: Per-room Y.Doc + Awareness, broadcast logic, autosave debounce, disconnect cleanup.
- `src/realtime/storage/version-store.ts`: Pluggable storage; file-backed store by default.
- Client: `src/lib/editor/collaboration/websocket-provider.ts` (already present) sends/receives Yjs and Awareness updates.

## Scale & Performance

- Target: <100ms p95 intra-DC latency. Server avoids heavy CPU in message path.
- Stateless frontends can shard rooms by `hash(roomId) % N` behind a TCP/WS load balancer.
- Sticky routing per `roomId` recommended to minimize doc hot-migration.
- For horizontal scale, persist and/or replicate state via Redis pub/sub or durable storage (Phase 3+).

## Security

- Optional JWT: append `?token=<jwt>` in WS URL. Verifies with `JWT_SECRET` if set.
- CORS origins may be constrained via `CORS_ORIGINS` (comma-separated).
- Rate limiting and per-room ACLs can be layered behind an HTTP gateway (Phase 3).

## Migration to Elysia

Elysia is preferred for backend services. This server is framework-agnostic and can be wrapped by Elysia’s WS plugin with the same `Room` and `VersionStore` interfaces when dependency installation is available.

