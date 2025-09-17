# Organization Backend Architecture (Swarm 2C)

Date: 2025-09-17

Owner: backend-typescript-architect (with architect lead mfoet77y-rslrm)

## Scope

- Workspace model and ownership
- Collections and folder hierarchy (tree)
- Permission inheritance (RBAC + ACE)
- Tag system and auto-suggestion
- Custom metadata storage and indexing
- Search integration preparation

## Database Schema (Prisma → PostgreSQL)

Key tables (new/updated in this task):

- workspaces
  - Adds `owner_id` (nullable) and relation to `users`.
- collections
  - Adds `type` enum `CollectionType { FOLDER, SMART }` to distinguish folders from smart views.
- access_control_entries
  - `(id, workspace_id, resource_type, resource_id, subject_type, subject_id, permissions, inherits, created_at)`
  - Unique on `(workspace, resource_type, resource_id, subject_type, subject_id)`.
- metadata_index
  - Flattened index of `knowledge.metadata` for targeted querying/sorting.

Enums:

- `ResourceType { WORKSPACE, COLLECTION, KNOWLEDGE }`
- `SubjectType { USER, ROLE }`
- `MetadataValueType { STRING, NUMBER, DATE, BOOLEAN }`

Notes:

- Collections already support arbitrary depth via `parent_id`. We enforce cycle prevention in the service layer.
- Tags remain in dedicated `tags` and `knowledge_tags` tables with `(name, workspace_id)` unique constraint.

## Permission Model

Layers:

1. RBAC (system/workspace roles) — fast-path checks via `rbacService`.
2. ACE (resource-scope overrides) — complements RBAC with subject-specific grants at workspace/collection/knowledge scope.
3. Inheritance — knowledge ⟵ collection ⟵ workspace (ACE with `inherits=true`).

Resolution order: direct RBAC → specific ACE (user, then role) → parent ACEs walking up to workspace.

## API Endpoints (Next.js App Router)

- `POST /api/workspaces` — create workspace (name, ownerId, description?, settings?).
- `GET /api/workspaces` — list workspaces (simple list; later filter by membership).
- `GET|PUT|DELETE /api/workspaces/:id` — retrieve/update/delete workspace.
- `POST /api/collections` — create collection/folder.
- `PUT|DELETE /api/collections/:id` — update/delete collection.
- `POST /api/collections/:id/move` — move collection to new parent (cycle-safe).
- `GET /api/tags?workspaceId=...` — list tags.
- `POST /api/tags` — create tag.
- `PUT|DELETE /api/tags/:id` — update/delete tag.
- `GET /api/tags/suggest?workspaceId=...&q=...&content=...&limit=...` — auto-suggestions.

Authentication/authorization hooks are ready to integrate (JWT verification and `aclService`), but currently permissive to keep Phase 1 gates unblocked. Wire-up is planned once auth type/lint issues are cleared.

## Tag Auto-Suggestion (Phase 2C baseline)

Algorithm (deterministic, lightweight):

- Score = prefix/exact matches (query) + content-term occurrences + log(popularity).
- Input: `workspaceId`, optional `q` (prefix), optional `content` (plain text), `limit` (default 8).
- Future enhancement (Phase 4): add AI suggested tags via `AIProcessingJob` and embeddings.

## Metadata Indexing

- `metadata_index` stores flattened key-paths from `knowledge.metadata` with typed columns and indexes.
- Reindex strategy on knowledge upsert: delete existing rows → insert fresh flattened entries.
- Benefits: efficient filters/sorts on structured metadata without full JSONB GIN reliance.

## Search Integration Prep

- Provide indexable document projection (planned in Phase 2D) consuming: knowledge, tags, collection path, metadata_index.
- Emit indexing tasks (future: to queue) on create/update/delete.

## Performance & Scale

- Hot paths (reads): indexed by `(workspace_id)`, `(parent_id)`, `(usage_count)`, `(key_path)`, typed value indexes in `metadata_index`.
- Write patterns: normalized with cascading deletes to keep referential integrity.
- Tree operations guarded against cycles (O(depth)) and capped to 128 ancestry steps.

## Security & Compliance

- Separate ACE table for explicit grants; denies modeled by absence of grants (simplifies evaluation).
- JWT-based auth to be enforced once Phase 1 type/lint are green.
- PII: minimize in logs; no secrets persisted in these modules.

## Testing Plan (follow-up PRs)

- Unit tests for `collectionService.move` cycle prevention.
- Unit tests for `tagService.suggest` scoring determinism.
- Integration tests for ACL resolution precedence with mock Prisma.

## Migration Plan

- Add columns/enums/tables as defined; backfill `owner_id` using existing admin assignments where available.
- No destructive changes to existing data; all new fields are additive with safe defaults.

