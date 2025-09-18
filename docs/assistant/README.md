# Knowledge Assistant (Swarm 4C)

Status: UI contracts and mocks implemented (September 18, 2025)

Scope: UI and provider-agnostic interfaces only. No AI infra, embeddings, or model integration in this change.

## Deliverables in this commit

- Assistant runtime and provider contracts: `src/lib/assistant/{types.ts,provider.ts}`
- Deterministic mock provider: `src/lib/assistant/mockProvider.ts`
- Shared React runtime:
  - Context provider + hooks: `src/lib/assistant/runtime-context.tsx`
  - Global dock experience: `src/components/assistant/AssistantDock.tsx`
- Feature surfaces (reused by the dock and feature demos):
  - Chat panel: `src/components/assistant/ChatPanel.tsx`
  - Research panel: `src/components/assistant/ResearchPanel.tsx`
  - Meeting transcription uploader: `src/components/assistant/TranscriptionUploader.tsx`
  - Context-aware help: `src/components/assistant/ContextHelp.tsx`
  - Fact-check helpers: `src/components/assistant/FactCheckBadge.tsx`
  - Editor suggestions (selection-based): `src/components/editor/plugins/AssistantSuggestions.tsx`
- App integration points:
  - Dock injection in layout: `src/components/layout/AppLayout.tsx`
  - Assistant overview route: `src/app/assistant/page.tsx`
- Storybook stories: `src/stories/Assistant.stories.tsx`
- Unit tests (mock determinism): `src/components/assistant/__tests__/assistant.mock.test.tsx`

## Usage

- Launch the copilot dock from the header shortcut or floating action on any page.
- `/assistant` now documents the integrated experience instead of hosting a stand-alone playground.
- `/editor-demo` still showcases inline suggestions; the dock mirrors the same context.
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

Transcription endpoint:
- Client uses `/api/ai/transcribe` (multipart/form-data, field `file`). Server performs transcription via OpenAI SDK and extracts summary/action items.

Fact-check grounding:
- Client uses `/api/ai/fact-check`; server asks model for status and augments evidence with `/api/search/suggest` results and the current document (if provided).

Streaming (optional):
- Set `NEXT_PUBLIC_ASSISTANT_STREAM=true` to enable streaming in ChatPanel (SSE via POST to `/api/ai/execute`).

Provider interface is defined by `AssistantProvider` in `src/lib/assistant/types.ts`.

### Runtime context

- `AssistantRuntimeProvider` (see `src/lib/assistant/runtime-context.tsx`) keeps a single provider instance and propagates shared context (route, selection text, document id, tags, etc.).
- Components can call `useAssistantRuntime()` to access the provider, current context, and mutators (`mergeContext`, `clearContext`).
- Global consumers emit `assistant:toggle` to open/close the dock without prop drilling.

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
