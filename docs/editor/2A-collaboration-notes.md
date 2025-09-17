# Swarm 2A Collaboration Notes — Frontend × Rust Systems

Date: 2025-09-17
Participants: rust-systems-expert, frontend lead (mfo289wz-t61g3)

## Deliverables this drop
- Performance architecture (docs/editor/performance-architecture.md)
- JS rope core (`src/lib/editor/rope-text.ts`) for immediate integration
- WASM core scaffold (`packages/kn-editor-core`) with build script
- Perf utilities (`src/lib/performance.ts#measure|measureAsync`)
- Smoke benches (`src/lib/editor/__tests__/performance.test.ts`) — gated by `PERF_STRICT=1`

## Proposed Editor Integration
- Editor model adapter exposes:
  - `getText(range?)`, `applyOps(ops)`, `subscribe(callback)` (to wire with UI view)
  - batch edits with rAF boundary; compose decorations diff per block
- Rendering: mount block virtualization with existing layout primitives in `src/components/ui/*`.

## Flags & Fallbacks
- WASM optional: loader at `src/lib/editor/wasm/index.ts`; fallback to JS rope.
- Strict perf assertions off in CI by default; enable locally via `PERF_STRICT=1 bun run test`.

## Next Steps (request to FE)
- Provide the editor view skeleton and block model interfaces we should target.
- Confirm Lexical vs Slate vs ProseMirror; we will supply adapters accordingly.
- Share any Storybook stories to run perf monitors during dev.

## Tracking
- Quality gate target: performance green, ≥8.5/10 overall.
- Bench success: sub-100ms bulk ops, sub-50ms keystroke-to-paint (measured in dev traces).

