# AI Integration Framework (Swarm 4A)

Scope: AI infrastructure and framework only — Agents SDK integration, prompt engineering framework, model configuration/management, agent-to-agent patterns, and auth/permissions. No content analysis, chatbot UI, or recommendations in this phase.

## Architecture Overview

```mermaid
flowchart LR
  UI[Product Features]
  API[/Next.js Route: /api/ai/*/]
  Guard[AI Guard\nRBAC + RateLimit]
  Agent[Agents Wrapper\n(OpenAI SDK)]
  Prompts[Prompt Framework\nTemplates + Vars]
  Config[Model Registry\nAI Config]

  UI --> API --> Guard --> Agent
  Prompts --> Agent
  Config --> Agent
```

### Key Modules

- `src/server/modules/ai/config.ts` — Loads env/config, validates setup.
- `src/server/modules/ai/models.ts` — GPT‑5 family registry and specs.
- `src/server/modules/ai/prompt.ts` — Typed prompt templates and renderer.
- `src/server/modules/ai/agents.ts` — Wrapper around OpenAI client (streaming/non-streaming).
- `src/server/modules/ai/agents-sdk-adapter.ts` — Optional OpenAI Agents SDK integration (non-stream in 4A).
- `src/server/modules/ai/policy.ts` — RBAC + rate limiting per user.
- `src/app/api/ai/execute/route.ts` — Minimal API entrypoint with SSE streaming.
- `src/app/api/ai/health/route.ts` — Health/config endpoint.

## Authentication & Permissions

- Reuses existing header/JWT guard via `requireAccess`.
- AI permissions use string scopes: `ai:invoke`, `ai:config`, `ai:admin`.
- Rate limiting: default 30 RPM per user (`AI_RPM` override). 429 on exceed.

## Prompt Engineering Framework

- Simple, type-safe variable substitution with required keys.
- Base system prompt (`BASE_SYSTEM_PROMPT`) enforces security posture.
- Composable templates per feature without coupling to content-analysis logic.

## API Design

`POST /api/ai/execute`

Request:
```json
{
  "model": "gpt-5-mini",
  "system": "optional system",
  "instructions": "optional instructions",
  "promptVars": {"k": "v"},
  "input": "string or JSON",
  "stream": false
}
```

Responses:
- 200 JSON (non-stream) `{ outputText, usage, model }`
- 200 `text/event-stream` (stream=true): events `text`, `error`, `done`
- 401/403 via guard, 429 on rate-limit, 503 when not configured

## Configuration

Environment variables:

```bash
OPENAI_API_KEY=...
OPENAI_BASE_URL= # optional
OPENAI_ORG_ID=   # optional
AI_DEFAULT_MODEL=gpt-5-mini
AI_REQUEST_TIMEOUT_MS=60000
AI_RPM=30
AI_ENGINE=agents  # use 'completions' to switch to standard client
```

## Agent-to-Agent Patterns

This framework exposes a clean `invokeAgent` surface for other internal agents/services. A2A broadcasts are out-of-process; emit readiness via guild when the A2A layer is available.

Guideline: prefer async streaming (`SSE`) for long-running tasks; use `traceId` headers for observability. Agents SDK path (AI_ENGINE=agents) currently returns non-streamed results in 4A.

## Runtime Notes

- Agents engine requires installing `@openai/agents`. The completions engine works with the standard OpenAI client (or the shipped stub in dev/test without network).

## Non-Goals (Phase 4A)

- No content analysis pipelines
- No assistant/chat UI or UX
- No recommendation algorithms

## Test Plan

- Unit: prompt rendering and model resolution
- API smoke: health endpoint returns configured false/true
- E2E: deferred until SDK/key present

## Performance Targets

- API p95 < 500 ms for non-streamed small prompts
- First token < 1.2 s with streaming
