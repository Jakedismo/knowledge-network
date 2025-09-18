# Knowledge Assistant UI Architecture (Swarm 4C)

## Overview

The Knowledge Assistant is delivered as a set of provider-agnostic UI components and a small client-side service interface. This allows parallel work: UI is stable while backend/AI teams implement providers.

- Provider factory: `createAssistantProvider(opts)` → returns `AssistantProvider`.
- Deterministic `MockAssistantProvider` ensures tests/demos work offline and without network.
- Editor integration uses a lightweight selection adapter to power suggestions.

## Modules

- `src/lib/assistant/types.ts`: canonical contracts for chat, suggestions, fact-check, research, transcription, help.
- `src/lib/assistant/provider.ts`: factory selecting provider by `NEXT_PUBLIC_ASSISTANT_MODE`.
- `src/lib/assistant/mockProvider.ts`: deterministic behaviors (no randomness, stable IDs).
- UI under `src/components/assistant/*` and `src/components/editor/plugins/AssistantSuggestions.tsx`.

## Data Flow

- Chat Panel sends `ChatTurn` with optional context (documentId, selectionText). Provider returns `ChatResponse` with optional citations.
- Suggestions Panel observes selection (text length ≥ 8) → calls `suggest()` → displays list.
- Fact Check sends a `claim` (+ optional documentId) → returns `supported | contradicted | uncertain` with evidence list.
- Research Panel collects a query and scope (`internal | external | both`) and shows items.
- Transcription Uploader sends bytes (mock) → returns transcript summary + action items.
- Context Help returns small static tips for now.

## Integration Points

- Editor Demo (`/editor-demo`) shows suggestions in a third column via `AssistantSuggestions` with a `getSelectionText()` adapter over the textarea.
- Application can embed `ChatPanel`, `ResearchPanel`, `FactCheckBadge`, and `ContextHelp` in any view.

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

