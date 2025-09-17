# ADR 0005: Collaboration Data Model — CRDT Selection

Date: 2025-09-17
Status: Proposed
Decision Drivers: performance, ecosystem maturity, offline support, determinism

## Context
We need a collaboration data model for the editor supporting sub-100ms local edits, deterministic merges, and offline-first sync.

## Options
1) OT (Operational Transform) — mature, but harder to reason about in complex transformations.
2) CRDT (e.g., Yjs) — strong ecosystem, good perf; supports offline/merge without a central server transform.
3) Rust CRDT (diamond-types) via WASM — excellent perf characteristics; smaller ecosystem.

## Decision
- Adopt Yjs as the baseline CRDT for Phase 2 to maximize speed of integration and ecosystem leverage.
- Provide adapter surfaces in our model layer to allow swapping to a Rust/WASM CRDT (diamond-types) if profiling shows bottlenecks.

## Consequences
Pros:
- Fast path to working collaboration with proven libs.
- Good interop with existing front-end editors.

Cons:
- Additional adapter maintenance to keep dual paths viable.

## Validation
- Measure reconciliation time p95 < 20ms for typical operation batches; conflict-heavy merges p95 < 50ms.

