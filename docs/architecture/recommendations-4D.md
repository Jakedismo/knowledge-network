# Swarm 4D — Smart Recommendations (Architecture)

Status: Implemented (algorithms + tests). Scope limited to discovery and ranking; no external AI infra invoked.

Focus Areas delivered:
- Content recommendation engine based on user activity (signals + personalization)
- Trending topics detection and analysis (time-window + z-score-like)
- Knowledge gap identification (org trending vs. user affinity)
- Duplicate content detection (MinHash-based, deterministic)
- Expert identification (engagement-weighted expertise per tag)
- Related content suggestions using AI (embeddings if present; lexical fallback)

Non-goals (per brief): No chatbot, no external AI service wiring, no heavy content analysis pipeline.

## Data Shapes

- ActivityEvent: `src/server/modules/recommendations/types.ts`
  - userId, workspaceId, type, knowledgeId?, tagIds?, authorId?, timestamp(ms)
- Content: reuses `IndexDocument` from search module.

## Algorithms Overview

- Signals (user/profile/popularity): Exponential half-life decay for recency, weighted by action type.
- Personalization: Content-based (tags, author, collection) + item-item neighbors; adds popularity and recency boosts.
- Trending: Recent window vs. baseline window counts per tag/"doc:" key → z-score-like ranking.
- Gaps: Compare user tag affinity vs. trending tags; recommend items that cover underexposed topics.
- Duplicates: Tokenize → shingles(k=3) → MinHash(128) → union-find clusters by similarity threshold.
- Experts: Aggregate decayed engagement on authored documents per tag and overall.
- Related Content: Prefer cosine on `searchVector` (if present from search pipeline); else lexical overlap fallback.

## Extensibility

- Embeddings: `related.ts` operates on `IndexDocument.searchVector` if present; vector dimension is unconstrained.
- Providers: `related.ts` exposes an `EmbeddingProvider` interface for future injection (Phase 4 AI infra).
- Config: Weighting and half-life are parameters in `RecommendationOptions` and detection functions.

## Quality

- Strict TypeScript with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` respected in module.
- Scoped type-check (`bun run recs:type-check`) and tests (`bun run test:recs`).
- No lint errors expected in new files (`bun run recs:lint`).

## Integration Notes

- Backend TS Architect: See `docs/api/recommendations-contract.md` for data feeds and service boundary.
- Rust Systems Expert: Leverage existing search vectors when available; for batch jobs, MinHash and trending windows are CPU-cache friendly and can be parallelized if moved to a service.

