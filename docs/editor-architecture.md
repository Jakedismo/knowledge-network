# Knowledge Editor — Phase 2A Deliverable (Frontend UI)

Date: 2025-09-17

## Scope

This document summarizes the editor shell, plugin system, LaTeX and media embed components, theming hooks, mobile considerations, and the testing approach added in Phase 2A groundwork.

## Architecture Overview

- Engine-agnostic shell (`src/components/editor/editor-shell.tsx`) exposes a minimal `EditorContext` and toolbar slots. We can later adopt TipTap/Lexical/Slate by mapping engine commands to the same surface area.
- Plugin Registry (`src/lib/editor/registry.ts`) stores `EditorPluginSpec` entries, supports enable/disable, and aggregates UI contributions (toolbar components, renderers).
- Security: all embed URLs pass strict sanitizers in `src/lib/editor/sanitizers.ts` to avoid XSS/SSRF and enforce privacy-enhanced endpoints where possible.
- Theming: components are Tailwind-first, compatible with existing theme tokens and dark mode. No blocking dependency on `next-themes` API for runtime.

## Implemented Plugins

- LaTeX Equations: `equationPlugin` with `Equation` renderer using KaTeX if present (graceful fallback to code). File: `src/components/editor/plugins/latex-equation.tsx`.
- YouTube Embed: `youtubePlugin` using `youtube-nocookie.com` with strict params. File: `src/components/editor/plugins/embed-youtube.tsx`.
- Vimeo Embed: `vimeoPlugin` with responsive `iframe`. File: `src/components/editor/plugins/embed-vimeo.tsx`.
- Twitter/X Embed: `twitterPlugin` privacy-friendly link-card (no third-party scripts). File: `src/components/editor/plugins/embed-twitter.tsx`.

## Plugin Management UI

- `PluginManager` lists registered plugins, toggling enabled state live. File: `src/components/editor/plugin-manager.tsx`.

## Mobile & Accessibility

- Toolbar controls are large touch targets (≥ 32px high) and keyboard-focusable.
- Embeds are responsive via `aspect-video` and avoid layout shifts.
- Equation fallback is accessible and screen-reader friendly (`aria-label`).

## Testing

- Unit tests cover registry behavior, sanitizers, and LaTeX fallback:
  - `src/components/editor/__tests__/registry.test.ts`
  - `src/components/editor/__tests__/sanitizers.test.ts`
  - `src/components/editor/__tests__/latex-equation.test.tsx`
- Run only editor tests while Phase 1 suites are being stabilized:
  - `bun run test --run src/components/editor/__tests__/*.test.*`

## Storybook

- Stories for shell and plugin manager:
  - `src/stories/EditorShell.stories.tsx`
  - `src/stories/PluginManager.stories.tsx`
- Stories self-register sample plugins for interactive inspection.

## Next Steps

1. Choose the underlying editor engine and implement the adapter layer mapping engine commands to `EditorContext` (deterministic, no runtime prompts).
2. Add Markdown, code blocks, and drag-and-drop media plugins.
3. Wire collaborative editing (CRDT/OT) via the Phase 2B infrastructure when ready.
4. Expand tests (keyboard navigation, focus management, SSR safety) and integrate accessibility audit in Storybook.
5. Resolve Phase 1 type/lint issues to allow full repo-wide type-check and test runs in CI.

