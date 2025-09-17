# Templates API (Phase 2E)

Base path: `/api/templates`

- `GET /api/templates?workspaceId=...&marketplace=1` — list workspace templates and optionally marketplace
- `POST /api/templates` — create
- `GET /api/templates/:id` — details + versions
- `PATCH /api/templates/:id` — update (commit)
- `DELETE /api/templates/:id` — delete
- `GET /api/templates/:id/versions?branch=main` — list versions
- `POST /api/templates/:id/versions` — commit version
- `POST /api/templates/:id/apply` — instantiate into a document
- `POST /api/templates/:id/share` — share via ACEs
- `POST /api/templates/:id/publish` — publish to marketplace
- `GET /api/templates/marketplace` — list public/unlisted listings
- `GET /api/templates/analytics?templateId=...` — usage summary

Auth headers (scaffold): `Authorization: Bearer <jwt>` or `x-user-id`, `x-workspace-id` as per `api-guard`.

Permissions checked: `template:*` actions through ACL/RBAC framework.

