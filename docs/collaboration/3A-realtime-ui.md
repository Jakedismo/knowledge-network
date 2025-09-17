# Swarm 3A — Real‑Time Collaboration UI (Frontend)

Date: 2025-09-17

Status: Implemented (UI only). No backend/API changes.

Scope: Cursor tracking, presence indicators, collaborative selection highlighting, typing indicators, live sync status, user awareness sidebar, and conflict warning UI. No comments/notifications/workflows/APIs.

## Components

- `PresenceSidebar` (`src/components/collab/PresenceSidebar.tsx`)
  - Shows online collaborators with color, typing state, and current block.
  - `onFollow(clientId)` callback provided for scroll/focus behavior.

- `SelectionOverlay` (`src/components/collab/SelectionOverlay.tsx`)
  - Draws semi‑transparent highlights for peer selections over the textarea in write mode.

- `SyncIndicator` (`src/components/collab/SyncIndicator.tsx`)
  - Displays realtime connection status and heuristic “Syncing…”/“Synced” label.

- `ConflictBanner` (`src/components/collab/ConflictBanner.tsx`)
  - Warns when local selection overlaps peer selections. UI‑only actions: “Keep mine”, “Review”.

## Integration

- Editor integration in `src/components/editor/Editor.tsx`:
  - Adds `SelectionOverlay`, `PresenceSidebar`, `SyncIndicator`, and `ConflictBanner`.
  - Keeps existing `CursorOverlay` and decoration‑based highlights for preview mode.
  - Uses existing `useCollaboration` provider (broadcast/websocket/mcp-ws).
  - `useTypingIndicator` updates `awareness.presence.typing` while user types.

## Awareness State Contract (UI)

TypeScript definitions in `src/lib/collab/types.ts`:

```
type UserPresence = { userId: string; displayName?: string; color?: string; avatarUrl?: string; typing?: boolean }
type SelectionPresence = { blockId: string; range?: { start: number; end: number }; color?: string; displayName?: string }
type AwarenessState = { presence?: UserPresence; selection?: SelectionPresence | null }
```

Notes:
- UI reads peer `selection` to render cursors and selection rectangles in write mode, and inline highlights in preview mode via block decorations.
- With `exactOptionalPropertyTypes`, optional properties are only set when defined (we avoid writing `undefined`).

## Demo & Stories

- Storybook: `src/stories/CollaborationUI.stories.tsx` uses a mock provider to demonstrate UI without backend.

## Accessibility & Performance

- All status/typing labels use `aria-live="polite"` where appropriate.
- Overlays are `pointer-events: none` to avoid interfering with editing.
- Selection overlay calculation batches DOM reads; rendering is limited to visible area.

## Non‑Goals

- No backend persistence, conflict resolution logic, or commenting.
- No protocol changes; relies on Phase 2B provider + Yjs Awareness.

## Next Steps (Optional)

- Hook “Follow” action to scroll to peer cursor position.
- Add a compact “presence bar” avatar stack for dense layouts.
- Drive `ConflictBanner` actions via actual merge policies (when backend lands).

