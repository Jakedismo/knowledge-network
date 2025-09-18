# Comments API (Phase 3B Mock)

Base: GraphQL (Apollo Client).

Auth: Apollo link injects `Authorization: Bearer <token>`; access control enforced server-side.

Operations:

- Query `comments(knowledgeId: ID!): CommentConnection!`
  - Used by `GET_COMMENTS` in `src/lib/graphql/queries.ts`.

- Mutation `createComment(input: CreateCommentInput!): Comment!`
  - Used by `CREATE_COMMENT`.

- Mutation `updateComment(id: ID!, input: UpdateCommentInput!): Comment!`
  - Used by `UPDATE_COMMENT`.

- Mutation `deleteComment(id: ID!): Boolean!`
  - Used by `DELETE_COMMENT`.

- Mutation `resolveComment(id: ID!): Comment!`
  - Used by `RESOLVE_COMMENT`.

- Query `users(workspaceId: ID!): [User!]!`
  - Used to power @mention suggestions; filtered client-side.

- Subscription `commentAdded(knowledgeId: ID!): Comment!`
  - Live updates for the panel (if subscription link configured); otherwise 10s polling fallback.

Types: see `src/types/comments.ts`.
