# Knowledge Assistant UI Architecture (Swarm 4C)

## Overview

The Knowledge Assistant now ships as a shared runtime with a global dock. Provider-agnostic components plug into the dock while remaining available for targeted embedding. The dock orchestrates chat, research, verification, and uploads using the same provider instance and shared context.

- Provider factory: `createAssistantProvider(opts)` → returns `AssistantProvider`.
- Deterministic `MockAssistantProvider` ensures tests/demos work offline and without network.
- Shared React runtime (`AssistantRuntimeProvider`) keeps a single provider instance and context for the whole tree.
- Dock UI (`AssistantDock`) consumes the runtime and exposes tabs for Chat and Workspace actions.

## Modules

- `src/lib/assistant/types.ts`: canonical contracts for chat (with history), suggestions, fact-check, research (with context), transcription, help.
- `src/lib/assistant/provider.ts`: factory selecting provider by `NEXT_PUBLIC_ASSISTANT_MODE`.
- `src/lib/assistant/mockProvider.ts`: deterministic behaviors (no randomness, stable IDs).
- `src/lib/assistant/runtime-context.tsx`: React context, hooks, and sanitation helpers.
- `src/components/assistant/AssistantDock.tsx`: floating dock with chat + workspace tabs.
- UI primitives under `src/components/assistant/*` and editor suggestions `src/components/editor/plugins/AssistantSuggestions.tsx`.

## Data Flow

- Chat Panel sends `ChatTurn` (question + optional history/context). Responses render inline and feed dock/state.
- Suggestions Panel observes selection (≥8 chars) → updates shared context + calls `suggest()`.
- Fact Check form submits a `claim` (+ optional documentId/context) → returns structured evidence.
- Research Panel collects query + scope + context → displays synthesized items.
- Transcription Uploader sends bytes → returns transcript summary + action items.
- Context Tips uses shared context (route, selectionText, tags) to fetch contextual helper copy.

## Integration Points

- Dock injected via `AppLayout`, surfaced globally (header shortcut + floating action).
- Editor Demo (`/editor-demo`) shows suggestions via `AssistantSuggestions` (still using `getSelectionText()`).
- Individual components remain embeddable for tailored workflows (e.g., inline fact check badges).

## Accessibility & UX

- Labels and ARIA attributes included (live regions for chat and fact-check status).
- Buttons use design system classes; layout stays responsive.

## Performance Targets (UI only)

- Render < 50ms for suggestion refresh on typical selections.
- No blocking network; mock provider resolves in microtasks.

## Risks & Mitigations

- Backend not ready → mitigated by mock provider and provider factory.
- Editor engine evolution → UI uses small `getSelectionText` adapter; can switch to engine API later.

## Testing Strategy

- Unit tests for provider determinism.
- Visual checks via Storybook stories.
