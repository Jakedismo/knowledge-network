# Swarm 4B — Content Intelligence

Scope: Auto‑tagging, summarization, concepts/entities, readability & quality scoring, translation (local stub), sentiment. Non‑goals: AI framework, chatbot, recommendations.

## APIs (Next.js Routes)

- Auth: Requires workspace context and permission `document:create` (via `x-user-id` and `x-workspace-id` headers or JWT).

- POST `/api/content-intel/analyze`
  - Body: `{ content: string, title?: string, workspaceId?: string, maxSummarySentences?: number, maxTags?: number, languageHint?: 'en'|'es'|..., targetLanguage?: 'es'|... }`
  - Response: `AnalyzeResult` with fields: `summary, keywords[{term,score}], tags[string[]], entities[{type,text,start,end}], concepts[string[]], readability{...}, quality{score,signals{...}}, sentiment{score,comparative,positive[],negative[]}, language{language,confidence}, translation?{language,content}`

- POST `/api/content-intel/summarize`
  - Body: `{ content: string, maxSentences?: number, languageHint?: string }`
  - Response: `{ summary: string, ranked: [{ index, score, text }] }`

- POST `/api/content-intel/tags`
  - Body: `{ content: string, max?: number, existing?: string[], title?: string, languageHint?: string }`
  - Response: `{ tags: string[] }`

- POST `/api/content-intel/translate`
  - Body: `{ content: string, target: LanguageCode, languageHint?: LanguageCode }`
  - Response: `{ translation: { language: LanguageCode, content: string } }`

## Implementation Notes

- Deterministic, dependency‑free heuristics:
  - Summarization: TextRank‑like sentence similarity scoring over token sets.
  - Keywords/Tags: TF with title boost and length boost, filtered by stopwords.
  - Entities: URLs, emails, dates, and naive capitalized sequences.
  - Readability: Flesch/FK, Fog, SMOG, ARI, Coleman‑Liau, LIX, RIX.
  - Quality Score: Weighted signals (length adequacy, readability, repetition, structure, language confidence).
  - Sentiment: Small embedded lexicon for offline scoring.
- Translation: Local phrasebook stub + identity; provider interface abstracted for later pluggable remote providers.

### Runtime Controls

- `CONTENT_INTEL_ENRICH` (default: enabled). Set to `0` to disable enrichment during knowledge create/update. When disabled, APIs remain available but server will not auto-enrich documents.
- `USE_ORG_GUARD` (default: `0`). Set to `1` to enforce org ACL via `requireAccess` for content-intel routes.
- `AGENTS_SUMMARIZE_ENABLED` / `AGENTS_TRANSLATE_ENABLED` (default: `0`). When set to `1`, summarization/translation use the Agents integration hook (`/api/ai/execute` → server `executeAgent`).
- `OPENAI_AGENTS_MODE` (default: `local`). Set to `openai` when wiring the real OpenAI Agents SDK; server will throw a clear error until configured.

### Agents Integration (Ready for Extension)

- Server entrypoint: `src/server/modules/ai/execute.ts` with `executeAgent({ instructions, input })`.
- API endpoint for FE: `POST /api/ai/execute` returns `{ outputText }`.
- Content-intel providers:
  - `AgentSummarizer` and `AgentTranslator` call `executeAgent` with `task: 'summarize'|'translate'`.
  - Toggle via env flags above; local heuristics remain as fallback.

## Integration Points

- Tagging: Results can be merged with Org Tags (`/api/org/tags/suggest`) by label matching in client or a future backend join.
- Search 2D: Keywords/Entities can be emitted as document metadata for indexing.
- Editor 2A: Client can pre‑view `analyze` results as users compose content.

## Quality & Testing

- TypeScript strict mode compatible. No external dependencies.
- Unit tests: `src/test/content-intel/*` + API tests `src/test/api/content-intel.api.test.ts`.
- Accessibility: N/A (backend), ensure responses include helpful labels and plain strings.
- Performance: O(n^2) over sentence count in summarizer; acceptable for typical docs (< 200 sentences). Consider sparse graph optimizations if needed.

## Future Providers (non‑blocking)

- Add remote translators and model‑backed summarizers via provider interfaces; respect org policy and secrets via env.
- Add language‑specific stopword sets and tokenizers as needed.
