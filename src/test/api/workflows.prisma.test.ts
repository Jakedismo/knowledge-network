import { describe, it } from 'vitest'

// Only run if TEST_PRISMA=1
const enabled = process.env.TEST_PRISMA === '1'

// Set repo flag before importing service
process.env.WORKFLOWS_REPO = 'prisma'

describe.runIf(enabled)('Workflows Prisma adapter (skeleton)', () => {
  it('is wired behind WORKFLOWS_REPO=prisma but not executed in this workspace', async () => {
    // Import lazily to honor env flag
    const { getWorkflowService } = await import('@/server/modules/workflows')
    const svc = getWorkflowService()
    // Calling will throw due to stubbed prisma; this is expected until DB is provided.
    let threw = false
    try {
      await svc.listWorkflows('w1')
    } catch {
      threw = true
    }
    if (!threw) throw new Error('Expected prisma adapter to throw without real DB')
  })
})

