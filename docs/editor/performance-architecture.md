# Editor Performance Architecture — Knowledge Network

Date: 2025-09-17
Owner: rust-systems-expert (collab: frontend lead mfo289wz-t61g3)
Status: Draft for Phase 2A kickoff (targets ≥8.5/10 quality)

## Objectives
- Sub-100ms perceived latency for editing operations on large documents (10,000–100,000 words).
- Stable memory usage with predictable GC behavior; avoid long main-thread blocks (>16ms).
- Seamless path to real-time collaboration (OT/CRDT) and search indexing.

## Budgets
- Keystroke-to-paint (p95): < 50ms; keystroke processing (model update) < 5ms; DOM patch < 10ms.
- Bulk operations (1k char paste / delete) p95: < 100ms.
- Cursor move/select changes p95: < 10ms.
- Spell/token pass (incremental) per change: < 5ms (off-main-thread or WASM), amortized.

## Data Structures
- Text storage: Rope (chunked balanced string) with 2–8KB leaf chunks.
  - JS fallback: `RopeText` (piecewise chunks) for immediate integration.
  - WASM core: Rust crate `kn-editor-core` using `ropey` (or custom) compiled to WebAssembly via `wasm-bindgen`.
- Decorations/token spans: interval tree over UTF-16 offsets; recompute only affected regions on edits.
- Selections/cursors: gap buffers per selection; render virtualization for many cursors.

## Rendering Strategy
- Block-based rendering: split document into logical blocks (paragraphs / code blocks). Only diff/render impacted blocks.
- Virtualization for very long documents: window ~2–4 screens, overscan 1 screen; anchor lines to preserve scroll position.
- Compose events: throttle layout-affecting updates with `requestAnimationFrame` and microtasks; avoid sync layouts.

## Real-time Collaboration Prep
- Choose CRDT with strong adoption & perf: Yjs (JS baseline) with path to Rust/wasm `diamond-types` if needed.
- Operation format: position-based + lamport clock for OT interop; map to CRDT insert/delete on client.
- Conflict resolution: use CRDT semantics; deterministic merge; compact ops in background.
- Network: batch ops at 50–100ms; coalesce idle flush; backpressure safeguards.

## Indexing & Search Prep
- Incremental inverted index (in-memory) over token IDs → positions, per block.
- Persisted/global search delegated to ElasticSearch (Phase 2D). Provide hooks to emit index updates on block commits.
- Tokenization strategy: streaming tokenizer (WASM-capable) yielding tokens + offsets; debounce on burst edits.

## WASM Modules
- `kn-editor-core` (Rust):
  - Rope APIs: `new`, `from`, `len`, `insert`, `delete`, `slice`, `char_to_byte`, `byte_to_char`.
  - Optional: incremental UTF-8/16 mapping table for fast coords.
  - Optional: simple diff and token walker utilities.
- Build via `wasm-pack` producing esm bindings; lazy-load in editor.

## Memory Management
- Avoid large contiguous strings; keep chunked representation through the stack.
- Reuse arrays; pooled objects for spans/tokens; avoid per-keystroke allocations.
- Large paste: stage in worker, split to chunks, apply to rope in batches.

## Benchmarking & Monitoring
- Bench scenarios:
  - Insert 1 char at 10k positions (simulate typing) → p95 < 5ms/op.
  - Paste/delete 1k chars at 3 positions → p95 < 100ms/op.
  - Cursor movement across 10k lines → p95 < 2ms/op.
- Add `performance.mark/measure` wrappers and vitest smoke tests (non-flaky, log-only thresholds in CI to start).

## Integration Plan
- Phase 2A Week 1: land JS RopeText + perf utilities, block virtualization hooks.
- Week 2: scaffold WASM crate; wire feature-flagged loader; add micro-bench + RUM hooks.
- Phase 3: integrate CRDT (Yjs) with rope adapter; benchmark reconciliation.

## Risks & Mitigations
- WASM toolchain not present in CI → provide JS fallback; compile step optional.
- Text encoding mismatches (UTF-16 vs UTF-8) → centralize mapping APIs.
- GC spikes with large strings → rope chunking and object pooling.

## Success Criteria
- Smoke benches pass on 10k-word docs.
- No long tasks > 50ms on edit interactions in dev traces.
- Quality gate performance targets met; A11y unaffected.

