# Template System — Phase 2E Architecture

Date: 2025-09-17

## Goals
- Template storage/management on top of Knowledge model
- Git-like versioning (commit messages, diffs, branches)
- Sharing/permissions (workspace, role, user; public marketplace)
- Integration APIs for Editor template insertion
- Search indexing for discoverability
- Analytics/usage tracking

## Data Model (Prisma)
- `Knowledge.isTemplate: boolean` — template flag
- `KnowledgeVersion.branchName: string` — version branch (default "main")
- `KnowledgeVersion.parentVersionId?: string` — ancestry for diff/merge
- `TemplateListing` — marketplace/publication metadata

## Services
- `TemplateService` — CRUD, versioning, apply (instantiate)
- `TemplateAnalyticsService` — records ActivityLog entries for view/use/share/publish
- `templatize.render(content, context)` — placeholder substitution with safe whitelist

## API Endpoints
- `POST /api/templates` — create template (workspace-scope)
- `GET /api/templates` — list (workspace + optional marketplace)
- `GET /api/templates/:id` — details
- `PATCH /api/templates/:id` — update; optional commit message + branch
- `DELETE /api/templates/:id` — delete
- `GET /api/templates/:id/versions` — list versions (by branch)
- `POST /api/templates/:id/versions` — commit new version
- `POST /api/templates/:id/apply` — instantiate into a document
- `POST /api/templates/:id/share` — grant ACEs to user/role/workspace
- `POST /api/templates/:id/publish` — create/update TemplateListing (public/unlisted)
- `GET /api/templates/marketplace` — discover public listings
- `GET /api/templates/analytics` — usage metrics

## Permissions
- New logical actions (checked via ACL/RBAC):
  - `template:create|read|update|delete|share|publish|use`
- Resource type: `KNOWLEDGE` (template is a knowledge entity)

## Search Integration
- Templates indexed like knowledge with extra facet `metadata.template.kind` and `isTemplate: true`.
- Emits `emitUpsert` on create/update and `emitDelete` on delete/unpublish.

## Analytics
- Reuse `ActivityLog` with `action` values: VIEW, SHARE, CREATE (use), UPDATE, DELETE, PUBLISH.
- `metadata.category: 'template'`, include `templateId`, `versionNumber`, `branchName`.

## Editor Integration
- `POST /api/templates/:id/apply` accepts `{ target: {workspaceId, authorId, collectionId?}, values: Record<string,string|number|boolean> }`.
- Returns created knowledge id and resolved content; does safe placeholder interpolation.

## Non‑Goals (Phase 2)
- Full 3-way merge/automatic conflict resolution (tracked by ancestry only)
- Paid marketplace/billing

