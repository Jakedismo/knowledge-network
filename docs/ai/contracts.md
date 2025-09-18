# AI Framework Contracts (Coordination)

This document aligns boundaries with backend-typescript-architect and ai-ui-designer.

## Server API (owned by backend)

- Endpoint: `POST /api/ai/execute`
- Auth: `Authorization: Bearer <JWT>` or `x-user-id` (dev), optional `x-workspace-id`
- Body:
```json
{
  "model": "gpt-5-mini",
  "system": "optional",
  "instructions": "optional",
  "promptVars": {"k":"v"},
  "input": "string or JSON",
  "stream": false
}
```
- Responses: 200 JSON, or `text/event-stream` when `stream=true`
- Errors: 401/403, 429, 503
- Rate limit: `AI_RPM` per user/minute

## Prompt Framework (shared)

- `renderPrompt(template, vars)` produces `{ system?, content }`
- Templates live close to features; no content-analysis logic in 4A.

## UI Integration (owned by ai-ui-designer)

- Do NOT build UI here. Consumers should:
  - Call `GET /api/ai/health` to detect availability
  - Call `POST /api/ai/execute` with `stream=true` to read SSE events `text|error|done`
  - Show permission and rate-limit errors gracefully

## Observability

- `X-Trace-Id` header supported for correlation
- Add client-provided trace IDs when available

## Security & RBAC

- Required permission to invoke: `ai:invoke`
- Elevated operations to be introduced later: `ai:config`, `ai:admin`

---

A2A broadcast: `guild_ai_framework_ready` once merged & configured.
