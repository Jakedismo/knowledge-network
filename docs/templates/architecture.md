# Template System Architecture (Swarm 2E)

Status: Phase 2 final swarm — baseline shipped on September 17, 2025.

## Goals
- Provide a safe, dependency-free template engine for Markdown content with simple helpers.
- Ship a template library (tech docs, meeting notes, retros, research, best practices, troubleshooting).
- Enable custom user templates with versioning and workspace/public visibility.
- Integrate with the Rich Text Editor via a toolbar plugin.
- Prepare for marketplace publishing (manifests, visibility, versioning) and collaboration.

## Components
- `src/lib/templates/engine.ts` — Handlebars-like renderer supporting `{{ key | helper('arg') }}`.
- `src/lib/templates/library.ts` — Built-in templates with metadata.
- `src/server/modules/templates/*` — File-backed store + service (JSON under `.holographic-memory/templates.json`).
- `src/app/api/templates/*` — Next.js app router API (list, CRUD, render).
- `src/components/editor/plugins/TemplateToolbar.tsx` — Editor toolbar button for insertion.
- `src/lib/templates/register-editor-plugin.ts` — Register plugin with editor plugin registry.

## Rendering Model
- Variables are declared per template; missing required variables are left as-is to prompt the UI to collect them.
- Helpers are pure string transformers (upper, lower, slug, date, now, trim, quotes). No arbitrary JS execution.
- Output is Markdown; minimal escaping protects against unsafe inline HTML in expressions.

## Data & Versioning
- Store: JSON file-based for development; can be swapped to DB or service.
- Version bump on PATCH optionally appends to `changelog`.
- Visibility: `private`, `workspace`, `public` for future marketplace readiness.

## Integration Points
- Editor Toolbar: Renders a modal gallery; selecting a template calls `/api/templates/render` then appends to current document.
- Organization (2C): Future step can enrich `context` with workspace, collection, tags. Current plugin passes `{}`; see `docs/templates/integration.md`.
- Search (2D): Documents created from templates are plain Markdown; indexing is unchanged.
- Collaboration (2B): Templates insert static content; collaborative editing continues normally.

## Security
- No code execution; helper allowlist only.
- API validates inputs with Zod; server-side storage isolated to `.holographic-memory/`.

## Performance
- Rendering is linear regex; negligible overhead compared to editor operations.
- Gallery uses SWR with simple query params; server slices results with limit/offset.

## Migration Plan
- Store abstraction (`template.store.ts`) supports replacement by DB or microservice later.
- Keep API shapes stable: `GET /api/templates`, `POST /api/templates`, `GET/PATCH/DELETE /api/templates/:id`, `POST /api/templates/render`.

## Optional Dependencies
- The collaborative editor modules expect `yjs` and `y-protocols/awareness`. Development builds fall back to lightweight stubs under `src/stubs/`; install real packages with `bun add yjs y-protocols` (or remove the alias in `next.config.js`) for production-grade collaboration.
- Search and organization adapters degrade gracefully when `@prisma/client`, `@elastic/elasticsearch`, or `ioredis` are absent. The aliases in `next.config.js` can be removed once those packages are added (e.g. `bun add @prisma/client @elastic/elasticsearch ioredis`).
- The fallbacks allow CI/builds to run without external downloads; when enabling the real services ensure environment variables (`ELASTICSEARCH_URL`, `REDIS_URL`, `ORG_ADAPTER=prisma`, etc.) are configured accordingly.
