# Organization API — Endpoints

Base: Next.js App Router under `/api/org`

- `GET /api/org/workspaces` → List workspaces for current user
- `POST /api/org/workspaces` `{ name, description? }` → Create workspace
- `GET /api/org/collections?workspaceId=…` → Return collection tree (nested)
- `POST /api/org/collections` `{ workspaceId, name, parentId?, description? }` → Create collection
- `POST /api/org/collections/move` `{ workspaceId, id, newParentId }` → Move
- `POST /api/org/collections/reorder` `{ workspaceId, id, newSortOrder }` → Reorder siblings
- `GET /api/org/tags/suggest?workspaceId=…&q=…` → Tag suggestions
- `POST /api/org/tags` `{ workspaceId, name, color? }` → Upsert tag
- `GET /api/org/metadata/schemas?workspaceId=…` → List metadata schemas
- `POST /api/org/metadata/schemas` `{ workspaceId, knowledgeType, version, title, description?, zodJson }` → Register schema

Auth: Bearer JWT required. Uses issuer `knowledge-network`, audience `knowledge-network-api`.

Notes:
- Current data provider is in-memory for demo; replace with Prisma adapter in Phase 2C rollout step 2.
- Permission checks use RBAC + ACL inheritance (`docs/organization/architecture.md`).

