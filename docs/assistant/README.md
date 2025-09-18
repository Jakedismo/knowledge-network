# Knowledge Assistant (Swarm 4C)

Status: UI contracts and mocks implemented (September 18, 2025)

Scope: UI and provider-agnostic interfaces only. No AI infra, embeddings, or model integration in this change.

## Deliverables in this commit

- Assistant service contracts and provider factory: `src/lib/assistant/{types.ts,provider.ts}`
- Deterministic mock provider: `src/lib/assistant/mockProvider.ts`
- UI components:
  - Chat panel: `src/components/assistant/ChatPanel.tsx`
  - Fact check badge: `src/components/assistant/FactCheckBadge.tsx`
  - Research panel: `src/components/assistant/ResearchPanel.tsx`
  - Meeting transcription uploader: `src/components/assistant/TranscriptionUploader.tsx`
  - Context-aware help popover: `src/components/assistant/ContextHelp.tsx`
  - Editor suggestions panel (selection-based): `src/components/editor/plugins/AssistantSuggestions.tsx`
- Demo route: `/assistant` → `src/app/assistant/page.tsx`
- Editor demo integration (sidebar suggestions): `src/app/editor-demo/page.tsx`
- Storybook stories: `src/stories/Assistant.stories.tsx`
- Unit tests (mock determinism): `src/components/assistant/__tests__/assistant.mock.test.tsx`

## Usage

- Visit `/assistant` for chat, research, transcription, and fact-check demos.
- Visit `/editor-demo` to see the suggestions sidebar update based on selection.
- Stories available under `Assistant/*` in Storybook.

## Provider integration

Set `NEXT_PUBLIC_ASSISTANT_MODE` to select a provider (default: `mock`).

Available modes:
- `mock`: deterministic offline provider (no network)
- `agents`: real provider calling `/api/ai/execute` (Agents SDK on server)

Server requirements for `agents` mode:
- Env: `OPENAI_API_KEY`, optionally `OPENAI_BASE_URL`, `OPENAI_ORG_ID`, `AI_DEFAULT_MODEL=gpt-5-mini`, `AI_ENGINE=agents`.
- Packages installed on server: `@openai/agents` and `openai`.
- Health check: `GET /api/ai/health` returns `{configured:true, engine:"agents", engineReady:true}` when ready.

Provider interface is defined by `AssistantProvider` in `src/lib/assistant/types.ts`.

## Accessibility

- All interactive components include labels or ARIA attributes.
- Keyboard focus preserved; buttons are reachable and state is announced where applicable.

## Non-goals in this change

- No embeddings, vector search, or content analysis.
- No recommendation systems.
- No external web access; research results are deterministic placeholders.

## Next steps (handoff to 4A/4B/Infra)

- 4A (AI Services Backend): Implement provider(s) for chat, suggestions, fact-checking, research, and transcription.
- 2D/Backend: Expose KB search and citation APIs for fact-check grounding.
- Wire FactCheck evidence to actual document/section IDs when available.
- Add `/api/ai/transcribe` for audio uploads and integrate OpenAI transcription or Agents SDK toolchain.
