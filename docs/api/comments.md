# Comments API (Phase 3B Mock)

Base: Next.js App Router, in-memory store (non-persistent).

Auth: Header-based via `requireAuth` (JWT or `x-user-id` fallback).

Endpoints:

- GET `/api/comments?knowledgeId=ID`
  - 200 `{ data: CommentModel[] }`

- POST `/api/comments`
  - Body `{ knowledgeId, parentId?, content, mentions?: CommentMention[], positionData?: CommentPositionData|null }`
  - 201 `{ data: CommentModel }`

- PATCH `/api/comments/:id`
  - Body `{ content?, status?: 'open'|'resolved'|'deleted'|'hidden' }`
  - 200 `{ data: CommentModel }`

- DELETE `/api/comments/:id`
  - 200 `{ ok: true }`

- GET `/api/comments/:id/replies`
  - 200 `{ data: CommentModel[] }`

- POST `/api/comments/:id/replies`
  - Body `{ content }`
  - 201 `{ data: CommentModel }`

- GET `/api/users/search?q=term`
  - 200 `{ data: { id, displayName, avatarUrl? }[] }`

Types: see `src/types/comments.ts`.

Migration to GraphQL:
- Replace REST calls with Apollo Client mutations/queries per `src/lib/graphql/{mutations,queries}.ts`.
- Preserve `positionData` and `mentions` in JSON until schema extension.

