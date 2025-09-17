# Swarm 2C — Organization Structure Handoff

Date: 2025-09-17

## Summary
- Implemented organization architecture and API scaffolding for workspaces, collections (nested), tags, and metadata schema registry.
- Added permission inheritance helper integrating RBAC + ACL overlays.
- Shipped a minimal client DnD FolderTree demo at `src/app/org-demo/page.tsx`.

## Code Map
- Types: `src/lib/org/types.ts`
- Permissions: `src/lib/org/permissions.ts`
- Service (in-memory adapter): `src/lib/org/service.ts`
- API routes: `src/app/api/org/*`
- UI demo: `src/components/org/FolderTree.tsx`, `src/app/org-demo/page.tsx`
- Docs: `docs/organization/architecture.md`, `docs/organization/api.md`

## How to Run
- `bun run dev` and open `/org-demo` for the DnD tree.
- API requires Bearer JWT with `issuer=knowledge-network`, `audience=knowledge-network-api`, `alg=HS256`, secret in `JWT_SECRET`.
- Feature flags / env:
  - `NEXT_PUBLIC_ORG_UI_ENABLED=1` to show tags + metadata side panel in `/editor`.
  - `ORG_ADAPTER=prisma` to use Prisma-backed org adapter (falls back to in-memory if Prisma is unavailable).

## Next Steps
- Replace in-memory adapter with Prisma implementation (Phase 2C step 2):
  - Create `src/lib/org/prisma-adapter.ts` mapping to `Workspace`, `Collection`, `Tag`.
  - Persist collection ACL in `collections.metadata.acl`.
- Wire permission checks into editor save flows and WS token mint (2B).
- Add tag metadata fields UI and autosuggest to Editor toolbar chip input.
- Add tests (Vitest):
  - `permissions.spec.ts` for inheritance cases
  - `service.spec.ts` for move/reorder semantics

## Env Reference
- `ORG_ADAPTER`: `prisma` | undefined. When `prisma`, attempts to load `@prisma/client` at runtime.
- `NEXT_PUBLIC_ORG_UI_ENABLED`: `1` to expose organization UI in editor demo.

## Acceptance & Quality
- Type-safe Zod contracts
- Lint/type-check friendly, no new deps
- A11y considerations: tree roles/aria, keyboard reordering
