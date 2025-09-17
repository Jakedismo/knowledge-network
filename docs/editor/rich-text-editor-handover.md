# Rich Text Editor — Phase 2A Handover

## Overview
- Location: `src/components/editor/*`, route demo at `src/app/editor/page.tsx`.
- Stack: React (Next.js 15 app router), Zustand for editor state, custom Markdown parser, PrismJS/KaTeX via CDN for preview, direct multipart GraphQL upload for media persistence.
- Goals met: toolbar-driven Markdown authoring, live preview, syntax highlighting, math rendering, image uploads with backend integration hooks, design-system alignment, accessibility baseline.

## Core Modules
| Responsibility | File(s) | Notes |
| --- | --- | --- |
| Editor shell | `Editor.tsx`, `state.ts`, `EditorProvider.tsx` | Provides persisted state (`kn-editor:v1`), exposes `EditorAPI`, orchestrates textarea, toolbar, preview. |
| Formatting logic | `toolbar-actions.ts` | Pure helpers for headings, lists, links, code blocks, images. Exact-selection friendly and unit-testable. |
| Toolbar UI | `Toolbar.tsx` | Uses design-system `Button`, `DropdownMenu`, `Tabs`, `Modal`. Hosts link modal and image uploader. |
| Preview renderer | `Preview.tsx` | Converts Markdown to HTML, applies PrismJS highlighting, KaTeX math rendering, embed transforms. Assets load via CDN. |
| Markdown engine | `markdown/parser.ts`, `markdown/escape.ts` | Deterministic parsing with HTML escaping, code fences, basic embeds, math blocks. |
| Media upload | `use-media-upload.ts`, `src/lib/graphql/media.ts`, `src/lib/graphql/client.ts` | Multipart `fetch` call to GraphQL `uploadMedia`; falls back to `blob:` URL on error (object revoked after 10s). |

## Rendering Pipeline
1. **Authoring:** Toolbar mutates Markdown using selection-aware helpers; textarea supports drag/drop and keyboard shortcuts.
2. **Persistence:** Zustand store persists `content` + `mode` to `localStorage`.
3. **Preview:** Markdown → HTML via parser. `PreviewBlocks` renders per-block HTML (hash-keyed) with viewport virtualization for large docs; `Preview` remains available for standalone use. After rendering it asynchronously:
   - Loads PrismJS + language bundles (`ts`, `tsx`, `jsx`, `json`, `bash`, `go`, `rust`, `python`, `markdown`, `yaml`).
   - Applies `Prism.highlightAllUnder(ref)` for scoped highlighting.
   - Converts `.katex-math` placeholders to KaTeX markup (`renderToString`, `role="math"`, `aria-label` preserved).
4. **Embeds:** Auto-detects standalone YouTube/Vimeo/X URLs → sanitized iframe/blockquote wrappers with responsive CSS (defined in `globals.css`).

## Formatting & UI Details
- Toolbar buttons mirror design tokens; dropdown triggers avoid `asChild` to prevent Radix slot errors.
- Link insertion uses Radix modal: captures current selection, enforces `http(s)` prefix, allows optional label override.
- Code block menu inserts fenced sections with `language-` classes; ready for Prism highlight.
- Mode switch via `Tabs` toggles write/preview; preview aria-live safe (no additional speech announcements yet).

## Media Handling
- File picker + drag/drop target images only.
- `useMediaUpload` posts multipart form-data to `uploadMedia` (`Upload` scalar). Requires backend support (`MediaUploadInput`, `uploadMedia` resolver).
- On success: inserts final URL + revokes temporary blob if fallback used.
- On failure: logs error, inserts local `blob:` URL so author workflow continues; blob revoked after 10 seconds.
- GraphQL endpoint: `NEXT_PUBLIC_GRAPHQL_ENDPOINT` (defaults to `http://localhost:4000/graphql`). Server must accept multipart/form-data POSTs.

## Syntax Highlighting & Math
- Prism/KaTeX scripts & styles load from `cdn.jsdelivr.net` at runtime; adjust CSP (`script-src`, `style-src`, `font-src`) accordingly.
- Additional Prism languages configured via `PRISM_LANGUAGE_FILES` in `Preview.tsx`.
- Math blocks use `$$` fences; inline math TBD. Errors fall back to original TeX string.

## Accessibility & UX
- Toolbar: `role="toolbar"`, buttons are keyboard accessible, link modal focus-trapped via Radix.
- Textarea: `aria-busy` during uploads, preserves selection after operations, supports Cmd/Ctrl+B.
- Preview: uses `prose` classes (Tailwind typography), KaTeX output accessible with `role="math"`/`aria-label`.
- Image insertion retains `alt` text (filename default); encourage authors to edit manually.

## Security & CSP Considerations
- Markdown escaped before HTML injection; only controlled embed templates inject iframes.
- Recommended CSP additions (once server-configured):
  - `img-src 'self' data: blob: https:`
  - `frame-src https://www.youtube.com https://player.vimeo.com`
  - `script-src 'self' https://cdn.jsdelivr.net` (adjust if you self-host assets)
  - `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`
  - Add `sandbox="allow-scripts allow-same-origin allow-presentation"` to embedded iframes if policy permits.
- Further sanitization (e.g., DOMPurify) optional once collaborative pasting enabled.

## Performance Notes
- Prism/KaTeX loaded lazily per preview render via CDN; browsers cache across sessions.
- Upload fallback uses `blob:` URLs; ensure `URL.revokeObjectURL` called (10s timeout currently).
- Consider debouncing preview for very large documents (present logic recalculates on every keystroke).

## Known Gaps / TODOs
- **Tests:** Add unit tests for `toolbar-actions`, parser edge cases, and integration tests for upload fallback.
- **Collaborative State:** Hooks ready for CRDT integration (Phase 2B) but not wired (no WebSocket store yet).
- **Placeholder Management:** When multiple uploads occur simultaneously, selection updates sequentially—add placeholders for better UX.
- **Link Modal Enhancements:** Add validation, history, quick suggestions, and keyboard shortcuts (Ctrl/Cmd+K).
- **Embed Sandbox:** Add `sandbox` attribute and explicit allowlist for iframes.
- **Accessibility:** Provide announcements for upload success/failure, ensure toolbar buttons have tooltip or text for screen readers (e.g., `<span className="sr-only">Bold</span>` additions).

## Operational Checklist
1. Ensure GraphQL backend exposes `uploadMedia` mutation + `Upload` scalar. If not available, toolbar falls back to local blobs (document this for QA).
2. For Storybook validation: `npm run storybook` → `Editor/RichTextEditor` story.
3. For KaTeX/Prism theming overrides, override CDN theme via `globals.css` or self-host assets.

## Next Collaboration Hooks
- `EditorAPI` (from `EditorProvider`) currently supports get/set content and cursor insertion—extend for commands palette when real-time features land.
- `useMediaUpload` intentionally exported; reuse for future drag/drop in knowledge templates/uploads.
- Parser located under `src/components/editor/markdown`—extend with block quotes, tables, tasks, sanitizer improvements using same architecture.
- `TokenIndexer` (browser) emits per-block token maps for Search Swarm 2D; subscribe via `useEditor().tokenIndexer`.
- `YjsEditorAdapter` (`src/lib/editor/yjs-adapter.ts`) syncs `EditorModel` with a Yjs `Doc` for collaborative editing; wire transport in Swarm 2B.
- Collaboration UI surfaces active peers (presence chips) and remote selections using block decorations (`type: 'presence'`). Local selection updates flow through `useCollaboration` hook.
- Cursor overlay in write mode computes caret positions for remote peers (monospaced textarea) and renders color-coded avatars above the text area.
- Comment/mention badges expose hover popovers leveraging decoration metadata; inline ranges render with highlight spans for mentions/presence.
- `<Editor>` accepts an optional `collaboration` prop (`{ roomId, presence, transport?, url?, socketFactory? }`) for auto bootstrapping either broadcast or WebSocket transports.

## Contact Points
- GraphQL schema assumptions documented in `src/lib/graphql/media.ts`.
- Design tokens referenced via `buttonVariants`, `TabsList` etc to ensure consistent theming.
- Document maintained by Frontend UI Engineer(s) in Phase 2A; update this handover as features evolve.
