# E2E Plan — Organization Panel

Use Playwright to verify organization UI flows. This repo ships Storybook; prefer testing the integrated story to decouple backend.

## Scenarios

- Keyboard navigation in TreeView
  - ArrowDown/Up move focus; Right expands, Left collapses
- Drag-and-drop reorder
  - Drag node before/after/inside target and assert new order
- Tag management
  - Add tag from suggestion and free-text (creates tag)
  - Remove tag via chip action
- Metadata form
  - Change fields; assert `UPDATE_KNOWLEDGE` network calls

## Suggested Setup

- Install Playwright (local dev)
  - npm i -D @playwright/test
  - npx playwright install
- Start Storybook
  - bun run storybook
- Run tests
  - npx playwright test

## Example (pseudo)

```ts
import { test, expect } from '@playwright/test'

test('Tree keyboard', async ({ page }) => {
  await page.goto('http://localhost:6006/?path=/story/organization-editororganizationpanel--localstatedemo')
  const tree = page.getByRole('tree')
  await tree.press('ArrowRight') // expand
  await tree.press('ArrowDown')
  await expect(tree).toBeVisible()
})
```

Notes
- Keep screenshots for regressions (page.screenshot). Store under artifacts in CI.
- Respect reduced motion and tab order in checks to ensure a11y compliance.
