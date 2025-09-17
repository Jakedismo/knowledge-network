# Comments & Mentions System — Architecture (Phase 3B)

Scope: UI-only Comments with threads/replies, @mentions with suggestions, anchoring to document sections, status (open/resolved/deleted/hidden), basic moderation/editing, and mention notifications UI. This phase uses REST mock APIs in the Next.js App Router for rapid integration and will transition to GraphQL when the backend is ready.

Key decisions:
- API Style now: REST under `/api/comments` and `/api/users/search` with in-memory store. No external deps.
- Future: Align to existing GraphQL schema in `src/lib/graphql/schema.ts` (`Comment`, `CreateCommentInput`, `resolveComment` etc.).
- Anchoring: positionData stores `{ blockId?, headingId?, headingText? }` derived by scanning DOM (`[data-block-id]` or heading elements with `id`).
- Mentions: UI captures `CommentMention { userId, displayName, start, length }` alongside raw text. Server stores array; future backend can parse/normalize.
- Security: Routes use `requireAuth` scaffolding. Replace with full auth+RBAC when Phase 1 strictness issues are resolved.

Data shapes:
- See `src/types/comments.ts` for `CommentModel`, `CommentMention`, `CommentPositionData` and statuses.

Non-goals:
- Real-time sync, activity feeds, and approval workflows (Phase 3A/3C+).
- Email/push notifications; only a UI badge is included.

Integration plan (to GraphQL):
1) Map REST payloads to GraphQL mutations: `createComment`, `updateComment`, `resolveComment`, `deleteComment` and queries `comments(knowledgeId)`.
2) Preserve `positionData` and `mentions` fields via GraphQL JSON scalars until dedicated types exist.
3) Replace `commentApi` with Apollo hooks + codegen, maintain component props stable.

Accessibility:
- Composer and suggestion list are keyboard accessible (focusable buttons, roles via native elements). Labels and titles included.

Performance & UX:
- Local in-memory store: O(1) ops for demo scale; infinite lists not required. Suggestion queries debounced ~120ms.

Testing notes:
- Unit render tests can mount `CommentsPanel` with mock fetch; see `commentApi` functions for interception points.

