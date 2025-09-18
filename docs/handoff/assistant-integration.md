# Assistant Dock Integration — Handoff

## Summary
- Introduced a shared assistant runtime (`src/lib/assistant/runtime-context.tsx`) that keeps one provider instance and propagates page context (route, selection, document metadata).
- Added the global Knowledge Copilot dock (`src/components/assistant/AssistantDock.tsx`) and mounted it from `AppLayout` so chat/research/fact-check/transcription are available on every screen.
- Refreshed `/assistant` to document the dock-centric workflow instead of shipping isolated demo widgets.
- Updated server execution (`/api/ai/execute` + fact-check route) to route capabilities through the Agents pipeline and return structured responses.

## Follow-ups / Open Questions
- Configure keyboard shortcut handler (e.g. `⌘J`) to dispatch `assistant:toggle` for accessibility.
- Audit Storybook stories to add dock scenarios and streaming variations once SSE is enabled in Agents mode.
- Expand shared context updates (e.g. document metadata on reader pages) by calling `mergeContext` where appropriate.
- Consider persisting chat history per workspace to avoid resets when dock closes.

## Validation
- Run `bun run type-check` and `bun run lint`.
- Run `bun run build` to ensure Next.js compiles with the new providers and API contracts.
- Manual smoke: open header "Copilot" button, trigger research/fact-check upload flows, verify health badge reflects `/api/ai/health`.

## References
- Runtime context: `src/lib/assistant/runtime-context.tsx`
- Dock UI: `src/components/assistant/AssistantDock.tsx`
- Layout integration: `src/components/layout/AppLayout.tsx`
- API orchestration: `src/app/api/ai/execute/route.ts`, `src/server/modules/assistant/runtime.ts`
