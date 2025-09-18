# A2A: guild_recommendations_ready

Status: Ready (Swarm 4D algorithms delivered)
Date: 2025-09-18

Summary:
- Personalized recommendations: content-based + item-item neighbors + popularity/recency boosts.
- Trending detection: recent vs. baseline window with z-score-like ranking.
- Knowledge gaps: org trending vs. user affinity; produces gap tags + items.
- Near-duplicates: MinHash-based clustering with deterministic hashes.
- Experts: engagement-weighted expertise per tag and overall per author.
- Related content: cosine on `searchVector` if present; lexical fallback otherwise.
- API routes `/api/recommendations/*` now backed by Prisma data, zod validation, JWT auth, and workspace membership checks.
- Client widget (`<RecommendationsWidget />`) powers `/recommendations` with refresh/error states, consuming live endpoints.

Backend coordination:
- See `docs/api/recommendations-contract.md` for proposed endpoints and inputs.
- Requires activity events feed; for demo, an in-memory adapter can be used.
- Honors `IndexDocument` from search module; vectors optional.

Next steps:
- Instrument API with metrics/observability (p95 latency, cache hit rate, CTR uplifts) and fold into Quality Gates.
- Replace in-memory fallbacks by streaming activity events into durable store (Redis stream or Kafka) for scale.
- Populate `knowledge_embeddings` via Phase 4 AI pipeline to unlock richer related-content signals.
