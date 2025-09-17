# Collaboration Protocol — Monitoring & Diagnostics

Date: 2025-09-17

## KPIs
- Realtime: p50/p95 RTT, apply latency p95, awareness fanout delay p95.
- Reliability: reconnect rate, resend rate, dupes dropped, OOM incidents.
- Scale: rooms active, participants per room p95, shard load balance, pub/sub lag.

## Metrics (namespaced)
- `collab.rtt_ms` (gauge, tags: roomId, shard)
- `collab.apply_duration_ms` (histogram)
- `collab.msg_in` / `collab.msg_out` (counter)
- `collab.bytes_in` / `collab.bytes_out` (counter)
- `collab.backpressure_on` (counter)
- `collab.dropped` (counter, reason tag)
- `collab.rate_limited` (counter, type tag)
- `collab.participants` (gauge)

## Logs
- Structured JSON; fields: `ts`, `traceId`, `roomId`, `seq`, `sid`, `userId`, `event`, `latency_ms`, `result`, `errCode`.

## Alerts
- Error rate > 1% over 5m.
- p95 RTT > 300ms over 5m.
- Resend rate > 5% over 5m.
- Backpressure toggles > 10/minute on any shard.

## Debug Endpoints
- `GET /collab/health` → shard status, rooms, participants.
- `GET /collab/room/:id` → participants, last seq, backlog.
- `GET /metrics` → Prometheus.

## Client Instrumentation
- Sample RTT via heartbeat echo; expose `onMetrics` hook.
- Emit `performance.mark/measure` around `applyUpdate`.

