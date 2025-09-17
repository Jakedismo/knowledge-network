# Template API

Base: `/api/templates`

- `GET /api/templates?q=&visibility=&workspaceId=&limit=&offset=` — list
- `POST /api/templates` — create
- `GET /api/templates/:id` — get
- `PATCH /api/templates/:id` — update
- `DELETE /api/templates/:id` — delete
- `POST /api/templates/render` — render by ID and context

## Schemas (simplified)

Create/Update body:
```
{
  name: string,
  description?: string,
  category?: string,
  keywords?: string[],
  version?: string,
  visibility: 'private'|'workspace'|'public',
  authorId?: string,
  workspaceId?: string,
  variables?: Array<{ key, label, type, required?, description?, defaultValue? }>,
  content: string
}
```

Render body:
```
{
  templateId: string,
  context: Record<string, unknown>
}
```

Render result:
```
{ content: string, appliedVariables: Record<string, unknown>, metadataUpdates?: { title?: string, tags?: string[], collectionId?: string } }
```

