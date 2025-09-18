# Comments & Mentions System — Architecture (Phase 3B)

Scope: UI-only Comments with threads/replies, @mentions with suggestions, anchoring to document sections, status (open/resolved/deleted/hidden), basic moderation/editing, and mention notifications UI. Backend is now ready; the implementation uses GraphQL via Apollo Client with optional subscription-based updates.

Key decisions:
- API Style now: GraphQL aligned to `src/lib/graphql/schema.ts` (`Comment`, `CreateCommentInput`, `UpdateCommentInput`, `resolveComment`, `comments(knowledgeId)`).
- Removed REST mention suggestions and migrated to `users(workspaceId)` GraphQL query for @mention suggestions.
- Optional subscription: `commentAdded(knowledgeId)` is wired when a subscription link is available; otherwise falls back to 10s polling.
- Anchoring: positionData stores `{ blockId?, headingId?, headingText? }` derived by scanning DOM (`[data-block-id]` or heading elements with `id`).
- Mentions: UI captures `CommentMention { userId, displayName, start, length }` alongside raw text. Server stores array; future backend can parse/normalize.
- Security: Routes use `requireAuth` scaffolding. Replace with full auth+RBAC when Phase 1 strictness issues are resolved.

Data shapes:
- See `src/types/comments.ts` for `CommentModel`, `CommentMention`, `CommentPositionData` and statuses.

Non-goals:
- Real-time sync, activity feeds, and approval workflows (Phase 3A/3C+).
- Email/push notifications; only a UI badge is included.

Integration details:
1) GraphQL operations: `createComment`, `updateComment`, `resolveComment`, `deleteComment`, `comments(knowledgeId)`; `users(workspaceId)` for suggestions; `commentAdded` for updates.
2) `positionData` and `mentions` remain JSON scalars for now; consider promoting to dedicated types later.
3) `commentApi` abstracts Apollo calls; UI components remain decoupled from transport.

Accessibility:
- Composer and suggestion list are keyboard accessible (focusable buttons, roles via native elements). Labels and titles included.

Performance & UX:
- Local in-memory store: O(1) ops for demo scale; infinite lists not required. Suggestion queries debounced ~120ms.

Testing notes:
- Unit render tests can mount `CommentsPanel` with mock fetch; see `commentApi` functions for interception points.
