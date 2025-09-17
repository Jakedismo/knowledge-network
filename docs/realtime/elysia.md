# Elysia Wrapper

This optional wrapper runs the realtime collaboration service on Elysia, aligning with backend guidelines while reusing the same Room/VersionStore core.

## Files
- `src/realtime/elysia.ts`: Elysia app with `/health` and a WS route at `COLLAB_WS_PATH`.

## Run
1) Install deps (when network installs are permitted):
   - `bun add elysia @elysiajs/ws`
2) Start the service:
   - `bun run realtime:elysia`

## Behavior
- WS route defers room association until the first client message (which includes `roomId`).
- Optional JWT verification reads `token` from query string if `JWT_SECRET` is set.
- Presence and updates are identical to the Bun-native server.

## Migration Notes
- The core abstractions `Room` and `VersionStore` remain unchanged, so further auth/rate-limit middleware and metrics endpoints can be added without touching the realtime logic.

