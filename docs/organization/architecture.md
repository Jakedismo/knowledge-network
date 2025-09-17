# Organization Structure — Phase 2C Architecture

## Scope
- Workspace management for team/project separation
- Collection hierarchy for topic grouping (nested folders)
- Drag-and-drop reorganization (move/reorder)
- Tag-based categorization with auto-suggestions and metadata fields
- Custom metadata framework per knowledge type
- Permission inheritance and access control integration

## Key Principles
- Type-safe contracts with Zod schemas
- Server APIs align with Next.js App Router
- Progressive data layer: in-memory adapter now; Prisma-backed later
- Permission inheritance: Workspace → Collection → Knowledge (override via ACL)
- Deterministic behaviors (no random IDs in protocols)

## Data Model (existing Prisma + logical overlays)
- `Workspace(id, name, settings, isActive, …)`
- `Collection(id, name, parentId, metadata JSON, sortOrder, workspaceId, …)`
- `Knowledge(id, title, collectionId, metadata JSON, workspaceId, …)`
- `Tag(id, name, color, usageCount, workspaceId, …)`
- RBAC: `Role`, `UserWorkspaceRole` (workspace-scoped roles)

Overlay (logical, stored in `metadata` until dedicated tables ship):
- Collection ACL: `metadata.acl = { allow: { roles: string[], users: string[] }, deny: { roles: string[], users: string[] } }`
- Metadata schema registry (workspace-scoped): stored in memory adapter now; future table `MetadataSchema`

## API Surface (v1)
- `GET /api/org/workspaces` → user workspaces
- `POST /api/org/workspaces` → create workspace
- `GET /api/org/collections?workspaceId=…` → tree
- `POST /api/org/collections` → create
- `POST /api/org/collections/move` → move node to new parent
- `POST /api/org/collections/reorder` → reorder siblings
- `GET /api/org/tags/suggest?q=foo&workspaceId=…` → suggestions
- `POST /api/org/tags` → create/upsert tag
- `GET /api/org/metadata/schemas?workspaceId=…` → list schemas
- `POST /api/org/metadata/schemas` → register/update schema

All endpoints require caller context (JWT) and apply `rbacService` + inheritance policy.

## Permission Inheritance
- Evaluate workspace role permissions first.
- Inherit downwards; lower levels may narrow via `deny` or widen via `allow`.
- Effective decision for (user, action, resource):
  1) If `deny` matches at any level → deny.
  2) Else if `allow` matches at any level OR RBAC grants → allow.
  3) Else → deny.

Resources & actions:
- Resources: `workspace`, `collection`, `knowledge`, `tag`.
- Actions: `create|read|update|delete|manage`.

## Metadata Framework
- Zod-based registry keyed by `knowledgeType`.
- Validate `Knowledge.metadata` and `Collection.metadata` against active schemas.
- Schema storage strategy:
  - Now: in-memory per workspace (API persists process-locally)
  - Later: Prisma table with versioning and soft-deletes

## Drag-and-Drop Model
- Pure HTML5 drag events in UI; optimistic reorder + move with server confirmation.
- Accessibility: keyboard reordering with up/down + Enter; announces changes via `aria-live`.

## Non-Goals (Phase 2C)
- Full Prisma integration / migrations
- Search facets and analytics (Phase 2D/6)
- Cross-workspace sharing (future ADR)

## Risks & Mitigations
- Serverless statelessness for in-memory adapter: demo-only; document persistence limits.
- RBAC stubs: constrain with inheritance policy; integrate DB in later phase.
- DnD without external lib: limited features; adequate for MVP and a11y.

## Integration Points
- Editor (2A): per-knowledge metadata validation on save.
- Collaboration (2B): permissions gate WS token minting by `workspaceId`/`knowledgeId`.

