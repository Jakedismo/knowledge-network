# Search Integration Preparation (Phase 2D Handoff)

Date: 2025-09-17

## Goal
Provide search-ready projections and index event plumbing so Swarm 2D can plug in an actual search backend (ElasticSearch) without changing org/knowledge code paths.

## Components

- Projection: `projectKnowledgeToIndex(id)`
  - File: `src/server/modules/search/projection.ts`
  - Produces a normalized `IndexDocument` with fields needed for indexing: workspaceId, title, contentText, author, collectionPath, tags, metadata, typed facets, timestamps.
  - Uses `metadata_index` table for typed facets; preserves original `knowledge.metadata` for source-of-truth.

- Types: `IndexDocument`, `IndexEvent*`
  - File: `src/server/modules/search/types.ts`

- Emitter: index event bus
  - File: `src/server/modules/search/emitter.ts`
  - Functions: `emitUpsert`, `emitDelete`, `emitReindexForCollection`, `emitReindexForTag`, and `registerIndexHandler`.
  - Default behavior logs events in dev when no handler is registered.

- Knowledge hooks
  - File: `src/server/modules/organization/knowledge.service.ts`
  - On create/update: reindex metadata and emit `UPSERT` event.

## How Swarm 2D Should Integrate

1. Implement an `IndexEventHandler` that:
   - For `UPSERT`: calls `projectKnowledgeToIndex(id)` and submits the document to ElasticSearch.
   - For `DELETE`: deletes by ID in the search index.
   - For `REINDEX_COLLECTION`/`REINDEX_TAG`: query the DB for affected knowledge IDs and enqueue UPSERTs.
2. Register the handler at process bootstrap:

```
import { registerIndexHandler } from '@/server/modules/search/emitter'
registerIndexHandler(new ElasticHandler(/* config */))
```

3. Define ES index mapping using `IndexDocument` shape. Suggested fields: keyword for IDs/tags, text for title/content/excerpt, nested for facets, date for timestamps.

## Notes
- Collection path builder is depth-limited to 128 to prevent cycles.
- `contentText` currently uses `knowledge.content` (plain text). If Phase 2A introduces a rich editor, provide plain-text extraction and update projection.
- Tag updates and collection moves can trigger reindex via the provided emitter functions (hook these in Tag/Collection services if needed).

