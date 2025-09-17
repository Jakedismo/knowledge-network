# A2A: guild_comments_system_ready

Status: Ready (Phase 3B UI deliverables)
Date: 2025-09-17

Summary:
- Threaded comments with replies implemented (REST mock).
- @mentions with suggestions (UI) implemented.
- Anchoring to document headings/editor blocks captured in `positionData`.
- Resolution/status changes + editing/deleting supported.
- Mention notifications badge (UI-only) added.
- API contract documented in `docs/api/comments.md`; architecture in `docs/architecture/comments-mentions.md`.

Backend coordination:
- Please confirm GraphQL alignment for `Comment` fields and JSON scalars for `positionData` & `mentions`.
- We will replace REST calls in `src/lib/comments/api.ts` with Apollo mutations/queries after schema green-light.

Next steps:
- Optional: add persistence adapter; wire to GraphQL resolvers.
- Optional: add Storybook stories and unit tests for composer and thread.

