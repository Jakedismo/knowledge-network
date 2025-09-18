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

Backend coordination:
- See `docs/api/recommendations-contract.md` for proposed endpoints and inputs.
- Requires activity events feed; for demo, an in-memory adapter can be used.
- Honors `IndexDocument` from search module; vectors optional.

Next steps:
- Wire API routes to surface module outputs; enforce RBAC filtering.
- Optionally stream events into a compact store; evaluate Redis or Postgres.
- If/when embeddings are available, populate `IndexDocument.searchVector`.

