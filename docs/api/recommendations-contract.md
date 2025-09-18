# Recommendations API Contract (Proposed)

Audience: backend-typescript-architect, rust-systems-expert

Scope: Data contracts and service boundaries for algorithms in `src/server/modules/recommendations/*`.

## Inputs

- Activity Events stream (append-only):
  - topic: `activity.events`
  - shape: `ActivityEvent` (see module types)
  - delivery: batched pull (API) or push (WS/kafka) — implementation-agnostic here

- Content Catalog:
  - source of truth: search projection `IndexDocument`
  - scope: per `workspaceId`

## Services

- GET /api/recommendations/personalized?user={id}&workspace={id}&limit=20
  - returns: `Scored<IndexDocument>[]`
  - notes: server-side render friendly; requires events store or recent cache

- GET /api/recommendations/trending?workspace={id}
  - returns: `{ tags: TrendingTopic[], items: Scored<IndexDocument>[] }`

- GET /api/recommendations/gaps?user={id}&workspace={id}
  - returns: `{ underexposedTags: {tagId, deficit}[], recommendations: Scored<IndexDocument>[] }`

- GET /api/recommendations/experts?workspace={id}
  - returns: `ExpertiseProfile[]`

- GET /api/recommendations/related?id={knowledgeId}&workspace={id}
  - returns: `Scored<IndexDocument>[]`

- GET /api/recommendations/duplicates?workspace={id}
  - returns: `DuplicateSet[]`

- POST /api/recommendations/events
  - body: `ActivityEvent` payload (timestamp optional; defaults to now)
  - returns: persisted event for audit/backfill

## Storage & Metrics (non-binding)

- Events retention: 30–90 days hot, 1y cold
- Half-life defaults: events 7d, content recency 14d; expose via config
- Metrics: coverage of personalized results, CTR uplift vs. baseline, duplication rate

## Security & Privacy

- Access control: filter by user permissions; do not emit items user cannot access
- PII: none required beyond `userId`; avoid storing free-text queries unless anonymized
