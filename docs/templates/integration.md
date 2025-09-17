# Integration Notes (2E ⇄ 2A/2B/2C/2D)

## Editor (2A)
- Import and call `registerTemplateEditorPlugin()` once in any page using the editor to enable the toolbar button.
- The toolbar opens a modal gallery and appends rendered Markdown to the current content.

## Collaboration (2B)
- Template insertion is a local mutation; remote peers will see the inserted Markdown via the normal collaborative pipeline.
- For OT/CRDT integration, consider broadcasting a semantic "insert-template" op in future to improve intent merge.

## Organization (2C)
- Planned: pass organization context to `POST /api/templates/render` (e.g., `{ workspace, collection, currentUser, tags }`).
- Current: plugin passes `{}`; server fills defaults where provided in template variables.

## Search (2D)
- Rendered Markdown is indexed like any other note. No additional changes required.

