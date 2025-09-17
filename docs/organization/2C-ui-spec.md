# Swarm 2C — Organization UI Components (Frontend)

This document describes the UI components and integration points added for Phase 2C: Organization Structure.

## Components

- WorkspaceSwitcher (`src/components/organization/WorkspaceSwitcher.tsx`)
  - Purpose: Switch between user workspaces with optional search.
  - A11y: Trigger is a button with label; listbox items announce selection.
  - Props: `workspaces`, `currentId`, `onSwitch(id)`.

- TreeView (`src/components/organization/TreeView.tsx`)
  - Purpose: Hierarchical folder/collection tree with keyboard navigation and DnD.
  - A11y: `role=tree`, `role=treeitem`, `aria-level`, `aria-expanded`, `aria-selected`.
  - Interactions: Arrow keys (Up/Down/Left/Right), drag-and-drop (before/after/inside events).
  - Props: `nodes: TreeNode[]`, `onToggle(id, expanded)`, `onSelect(id)`, `onMove({ sourceId, targetId, position })`.

- TagManager (`src/components/organization/TagManager.tsx`)
  - Purpose: Manage document tags via chips + combobox suggestions.
  - A11y: `role=combobox`, `aria-autocomplete=list`, `listbox` for suggestions.
  - Props: `value`, `onChange`, `suggestions`.
  - Apollo container behavior (in EditorOrganizationApolloPanel): When a user adds free-text tags not present in workspace suggestions, the panel creates tags via `CREATE_TAG(workspaceId,name)` and then updates the document’s `tagIds`.
  - Nice-to-have: Inline color picker allows setting a color for a new free-text tag; the color is sent in `CREATE_TAG`.

- MetadataForm (`src/components/organization/MetadataForm.tsx`)
  - Purpose: Render dynamic metadata fields with validation (RHF + Zod).
  - Field types: `text`, `number`, `boolean`, `date`, `select`, `multiselect`, `url`.
  - Props: `fields`, `values?`, `onChange?`, `onSubmit?`.

- Breadcrumbs (`src/components/organization/Breadcrumbs.tsx`)
  - Purpose: Organization navigation breadcrumbs.
  - A11y: `nav` with `aria-label=Breadcrumb`, last item `aria-current=page`.

- EditorOrganizationPanel (`src/components/organization/EditorOrganizationPanel.tsx`)
  - Purpose: Integrates switcher, breadcrumbs, tree, tags, and metadata into an editor-side panel.
  - Props combine those of the sub-components to stay headless/presentational.

- EditorOrganizationApolloPanel (`src/components/organization/EditorOrganizationApolloPanel.tsx`)
  - Purpose: Data-bound panel for a specific knowledge document.
  - Wiring: GET_KNOWLEDGE, GET_WORKSPACE (collections/tags), UPDATE_KNOWLEDGE (metadata/tags/collection), MOVE_COLLECTION, UPDATE_COLLECTION (sortOrder).
  - Notes: “before/after” reorders siblings locally and persists sequential `sortOrder` via multiple `UPDATE_COLLECTION` calls.
  - Optional optimization: attempts `REORDER_COLLECTIONS(workspaceId, orders[])`; falls back to multiple `UPDATE_COLLECTION` when not available.
  - Metadata fields: resolved from client-side registry (`src/lib/metadata/registry.ts`) based on a rudimentary knowledge kind (`doc` vs `spec`). Replace with backend-provided schemas in a later phase.

## Hooks (Apollo GraphQL)

New convenience hooks in `src/lib/org/hooks.ts` for wiring to GraphQL:

- `useMyWorkspaces()` → maps `GET_MY_WORKSPACES` to `WorkspaceOption[]`.
- `useWorkspaceTree(workspaceId)` → maps `GET_WORKSPACE.collections` (and `tags`) to `TreeNode[]` and `TagOption[]`.
- `useMoveCollection()` → wraps `MOVE_COLLECTION(id, parentId)`.

Notes:
- The current server mutation only supports parent changes. “before/after” requires sort-order support; emit as parent move for now.

## Stories & Tests

- Stories
  - `src/stories/Organization.stories.tsx` — per-component demos.
  - `src/stories/EditorOrganizationPanel.stories.tsx` — integrated panel demos (local state and Apollo-mocked).
- Tests
  - `src/components/organization/__tests__/tag-manager.test.tsx`
  - `src/components/organization/__tests__/tree-view.accessibility.test.tsx`

## A11y & Responsive

- Storybook a11y addon enabled; components expose semantic roles and labels.
- Panel layout stacks on small viewports; width targets: `sm:w-80 md:w-96`.
- Reduce motion supported implicitly via pure-CSS interactions; no timed animations required.

## Integration Pointers

- In app pages, wrap with ApolloProvider and pass real data to `EditorOrganizationPanel`.
- Map document-level tag and metadata save flows via `UPDATE_KNOWLEDGE` (server input contracts).
- For Rich Text Editor, panel can live beside the editor; trigger updates through existing EditorProvider APIs when needed.
- Example page route added: `src/app/knowledge/[id]/page.tsx` rendering `ClientPanel` with `EditorOrganizationApolloPanel` and `EditorShell` under a shared `ApolloProvider`.
  - The root layout now wraps the app in an ApolloClientProvider to make GraphQL available everywhere.

## Open Items (Phase 2C Follow-ups)

- DnD before/after precise ordering (depends on server sort-order mutation).
- Tag creation vs suggestion API alignment.
- Metadata schemas per knowledge type; dynamic field registry.
- E2E tests and keyboard focus management across panel/Editor.
