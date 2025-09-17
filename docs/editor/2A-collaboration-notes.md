# Swarm 2A Collaboration Notes — Frontend × Rust Systems

Date: 2025-09-17
Participants: rust-systems-expert, frontend lead (mfo289wz-t61g3)

## Deliverables this drop
- Performance architecture (docs/editor/performance-architecture.md)
- JS rope core (`src/lib/editor/rope-text.ts`) + `EditorModel` diff engine (`src/lib/editor/model.ts`)
- Block-based + virtualized preview rendering (`src/components/editor/PreviewBlocks.tsx`) using cached hashes and live viewport virtualization
- Token indexer + worker (`src/lib/editor/token-index.ts`, `tokenizer.worker.ts`) emitting block token maps
- Yjs collaboration adapter (`src/lib/editor/yjs-adapter.ts`) bridging EditorModel ↔ CRDT document
- Collaboration providers: broadcast (`src/lib/editor/collaboration/broadcast-provider.ts`) and WebSocket-ready (`src/lib/editor/collaboration/websocket-provider.ts`) exposed via `useCollaboration`/`useBroadcastCollaboration`; env `NEXT_PUBLIC_COLLAB_WS_URL` controls default endpoint.
  - Token fetch helper: `src/lib/editor/collaboration/get-ws-token.ts` calls `/api/collab/ws-token` to mint a short-lived WS token for Python WS (`aud=collab-ws`).
- Storybook performance harness (`src/stories/EditorPerformance.stories.tsx`) seeding 150+ sections to showcase virtualization, decorations, collaboration hook + multi-peer scenario (`CollaborativePeers`) and WebSocket replay demo (`WebSocketTransport`)
- WASM core scaffold (`packages/kn-editor-core`) with build script
- Perf utilities (`src/lib/performance.ts#measure|measureAsync`)
- Smoke benches (`src/lib/editor/__tests__/performance.test.ts`, `model.test.ts`) — STRICT via `PERF_STRICT=1`

## Proposed Editor Integration
- Editor model adapter exposes:
  - `model.updateFromText`, `replaceRange`, `applyOps`, `getSnapshot`
  - `tokenIndexer.subscribe` for search infrastructure; emits `{ token -> [blockId, positions] }`
- Rendering: block-by-block HTML diff with viewport virtualization (auto-enabled for large docs) using model hashes and cached HTML.
- Decorations: block-level decoration APIs on `EditorModel` allow FE to attach highlights/annotations; `PreviewBlocks` exposes them via `data-decoration-types` and now supports inline ranges for mentions/presence cursors.
- Cursor overlay: write mode renders live cursor avatars by sampling textarea line height/char width; remote selections publish via `awareness.selection` structure.
- Collaboration status badges surfaced via `useEditor().collaborationStatus`; default env token `NEXT_PUBLIC_COLLAB_TOKEN` optional.
- Comment/mention popovers include actionable buttons (reply/view) leveraging decoration metadata.

## Flags & Fallbacks
- WASM optional: loader at `src/lib/editor/wasm/index.ts`; fallback to JS rope.
- Token indexer degrades gracefully when Web Workers unavailable (logs once and continues).
- Strict perf assertions off in CI by default; enable locally via `PERF_STRICT=1 bun run test`.

## Next Steps (request to FE)
- Provide the editor view skeleton + block decorations API so we can surface highlights/mentions alongside block hashes.
- Confirm Lexical vs Slate vs ProseMirror timeline; adapters will target `EditorModel` ops surface.
- Share Storybook stories (write/preview) to exercise block diff + token indexer; we can wire `measure()` output to Storybook panels.
- Coordinate on Yjs provider (Doc + awareness) wiring; adapter exposes `getDoc()` for injection into realtime transport.
- Validate multi-tab sync using broadcast provider; when backend WebSocket endpoint lands, swap provider implementation.

## Tracking
- Quality gate target: performance green, ≥8.5/10 overall.
- Bench success: sub-100ms bulk ops, sub-50ms keystroke-to-paint (measured in dev traces).
