# Activity Feeds & Notifications (Swarm 3C)

Scope: Backend services and APIs for activity tracking, feed filtering/personalization, notification delivery, preferences, real-time push, and aggregation.

## Data Model (Prisma)

- `ActivityLog`: action, resourceType, resourceId, metadata, userId, workspaceId, timestamps.
- `UserNotification`: title, message, type, isRead, actionUrl, metadata, userId, timestamps.
- `User.preferences` JSON: `{ follows: { collections[], tags[], authors[] }, notifications: { channels, categories, quietHours, digest } }`.

These are already present in `prisma/schema.prisma`.

## Services

- `ActivityService`
  - `log(input)`: create activity log.
  - `feed(opts)`: fetch recent activity with a simple scoring model using follows in preferences; returns `score` per item.
  - `summarize(opts)`: bucketed counts by action over hourly/daily/weekly.

- `NotificationService`
  - `create(input)`: store and publish notification (web channel) via in-memory broker.
  - `list(opts)`: list notifications for user.
  - `markRead(userId, id, isRead)`: toggle read state.
  - `preferences(userId)`, `updatePreferences(userId, patch)`.

- `PushBroker` (in-memory): event emitter keyed by user for SSE. Replaceable by Redis Pub/Sub or provider adapters later.

## API Routes

- `POST /api/activity/log` — Track an activity event.
- `GET  /api/activity/feed` — Query feed with filters (actions, resourceTypes, resourceIds, authoredBy, limit).
- `GET  /api/activity/summary` — Aggregated counts by period with optional since/until.
- `GET  /api/notifications` — List notifications (supports `unreadOnly`, `limit`).
- `POST /api/notifications` — Create a notification (system/admin; guarded).
- `PATCH /api/notifications/:id/read` — Mark read/unread.
- `GET  /api/notifications/preferences` — Read preferences.
- `PUT  /api/notifications/preferences` — Update preferences (shallow merge).
- `GET  /api/notifications/stream` — SSE stream for real-time delivery.

All endpoints use `requireAuth` guard. For workspace-scoped operations, include `x-workspace-id` (or JWT with `workspaceId`).

## Real-Time Delivery

- Uses Server-Sent Events (SSE) under `nodejs` runtime in route handler.
- Heartbeat every 25s keeps proxies from closing the connection.
- Event format: `event: message` with payload `{ kind, data }` where `kind` is `notification` or `notification:update`.

## Personalization & Filtering

- Uses `User.preferences.follows` for boosting feed items by collections/tags/authors.
- Simple heuristic scoring; deterministic ordering by `(score desc, createdAt desc)`.
- Filters supported via query params in `/api/activity/feed`.

## Integration Hooks

- `KnowledgeService.create|update` now emits `ActivityLog` rows.
- Future: add hooks in tag/collection services and search events.

## Security & Privacy

- All endpoints require auth; POST to others users in `/api/notifications` requires workspace context.
- Avoids leaking cross-workspace data by scoping queries to `workspaceId` when present.
- Input validation with `zod`; statuses use strict enums.

## Extension Points

- Replace `PushBroker` with Redis or a message bus for multi-instance scale.
- Add channels (email, web push) by implementing adapters and honoring `preferences.notifications.channels`.
- Add aggregation for top actors/resources and organization digests.

## Usage Examples (cURL)

```
curl -X POST /api/activity/log \
  -H 'x-user-id: u1' -H 'x-workspace-id: w1' \
  -H 'Content-Type: application/json' \
  -d '{"action":"CREATE","resourceType":"KNOWLEDGE","resourceId":"k1","metadata":{"title":"Doc"}}'

curl '/api/activity/feed?limit=20&actions=CREATE,UPDATE' \
  -H 'x-user-id: u1' -H 'x-workspace-id: w1'

curl '/api/notifications?unreadOnly=true' -H 'x-user-id: u1'

curl -X PATCH /api/notifications/n1/read -H 'x-user-id: u1' \
  -H 'Content-Type: application/json' -d '{"isRead":true}'

curl -N '/api/notifications/stream' -H 'x-user-id: u1'
```

