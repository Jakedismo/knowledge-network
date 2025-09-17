# Rich Text Editor Core (Swarm 2A)

This directory contains the baseline, dependency-free editor core and plugin architecture for Phase 2A. It is designed to work today (no network installs) and to accept Lexical/Slate and KaTeX/highlight.js adapters when package installation is available.

## Overview

- `src/components/editor/` – UI components, state, toolbar, preview, and plugin manager.
- `src/components/editor/markdown/` – Minimal Markdown → HTML engine with basic sanitization and auto-embeds.
- `src/lib/editor/*` – Engine-agnostic plugin registry and types.

## Current Capabilities (no external deps)

- Markdown editing with live preview (headings, emphasis, links, images, code fences, lists).
- Code blocks rendered with `data-lang` and `language-<lang>` classes for future highlighters.
- Drag & drop image upload with client-side resize to JPEG (1600x1200, ~0.82 quality).
- Auto-embeds for YouTube, Vimeo, and X/Twitter links placed on their own line.
- LaTeX blocks (`$$ ... $$`) rendered as placeholder spans (`.katex-math`) for future KaTeX hydration.
- Pluggable toolbar and plugin registry (see `src/lib/editor/registry.ts`).

## Planned Adapters (when network install is allowed)

- Syntax highlighting: Prism.js or highlight.js adapter hydrating `<pre><code>` blocks.
- Math rendering: KaTeX adapter hydrating `.katex-math` nodes.
- Editor engine: Lexical or Slate adapter implementing `EditorContext.dispatch` with rich nodes.

## Demo

Visit `/editor-demo` to try the editor. The page sets initial content and registers default plugins.

## Testing

- Unit tests cover the Markdown parser (`markdown.test.ts`).
- More tests for toolbar actions and image pipeline can be added when JSDOM canvas is available.

## Security Notes

- Raw HTML is escaped by default; only editor-generated tags are emitted.
- Links use `rel="noopener noreferrer"` and `target="_blank"`.

