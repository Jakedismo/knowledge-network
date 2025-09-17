# Organization API

Version: v1 (2025-09-17)

Base: `/api`

## Workspaces

- `GET /workspaces` → `{ items: Workspace[] }`
- `POST /workspaces` body `{ name: string, ownerId: string, description?: string, settings?: object }`
- `GET /workspaces/:id` → `Workspace`
- `PUT /workspaces/:id` body `{ name?, description?, settings?, isActive? }`
- `DELETE /workspaces/:id` → `{ ok: true }`

## Collections (Folders)

- `POST /collections` body `{ name, workspaceId, parentId?, description?, color?, icon?, type?: 'FOLDER'|'SMART' }`
- `PUT /collections/:id` body `{ name?, description?, color?, icon? }`
- `DELETE /collections/:id` → `{ ok: true }`
- `POST /collections/:id/move` body `{ parentId: string|null, workspaceId: string }`

## Tags

- `GET /tags?workspaceId=...` → `{ items: Tag[] }`
- `POST /tags` body `{ workspaceId, name, color? }` → `Tag`
- `PUT /tags/:id` body `{ name?, color? }` → `Tag`
- `DELETE /tags/:id` → `{ ok: true }`
- `GET /tags/suggest?workspaceId=...&q=...&content=...&limit=8` → `{ items: Tag[] }`

Notes:

- All endpoints expect authenticated requests (JWT) in future; currently unauthenticated for scaffolding.
- Errors: return `{ error: string }` with appropriate HTTP status codes.
## Knowledge

- `POST /knowledge` body `{ workspaceId, authorId, title, content, collectionId?, metadata? }` → `{ id, metadata }` and triggers metadata indexing
- `PUT /knowledge/:id` body `{ title?, content?, collectionId?, metadata?, status? }` → `{ id, metadata }` and reindexes metadata

Auth headers:

- Prefer `Authorization: Bearer <JWT>` (with `sub` and optional `workspaceId` in payload). Fallback for staging: `x-user-id`, `x-workspace-id`.

