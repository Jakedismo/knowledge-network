import { test, expect } from '@playwright/test'

type RouteCheck = {
  path: string
  heading: string
  match?: 'text'
}

const primaryRoutes: RouteCheck[] = [
  { path: '/dashboard', heading: 'Dashboard' },
  { path: '/knowledge', heading: 'Knowledge Base' },
  { path: '/knowledge/documents', heading: 'Documents' },
  { path: '/knowledge/collections', heading: 'Collections' },
  { path: '/knowledge/tags', heading: 'Tags & Taxonomy' },
  { path: '/search', heading: 'Unified Knowledge Search' },
  { path: '/analytics/insights', heading: 'Insights' },
  { path: '/collaboration', heading: 'Collaboration' },
  { path: '/collaboration/active', heading: 'Active Sessions' },
  { path: '/collaboration/activity', heading: 'Team Activity' },
  { path: '/collaboration/reviews', heading: 'Reviews' },
  { path: '/settings', heading: 'Settings' },
  { path: '/notifications', heading: 'Notifications' },
  { path: '/profile', heading: 'Alex Rivera', match: 'text' },
  { path: '/documents/new', heading: 'Create Document', match: 'text' },
]

test.describe('Main navigation coverage', () => {
  for (const route of primaryRoutes) {
    test(`renders ${route.path}`, async ({ page }) => {
      await page.goto(route.path)
      if (route.match === 'text') {
        await expect(page.getByText(route.heading, { exact: false })).toBeVisible()
      } else {
        await expect(page.getByRole('heading', { name: route.heading, exact: false })).toBeVisible()
      }
    })
  }

  test('captures knowledge base screenshot for review', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/knowledge')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: '.playwright-mcp/navigation-knowledge.png',
      fullPage: true,
    })
  })
})
