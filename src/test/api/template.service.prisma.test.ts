import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { getSqlitePrismaClient } from '../helpers/prisma-sqlite'

let prisma: any | null = null
const enabled = process.env.E2E_PRISMA_SQLITE === '1'

describe.runIf(enabled)('TemplateService with SQLite Prisma', () => {
  beforeAll(async () => {
    prisma = await getSqlitePrismaClient()
    if (!prisma) throw new Error('SQLite Prisma client not available. Run scripts/setup-sqlite-prisma.sh')
  })

  afterAll(async () => {
    if (prisma) await prisma.$disconnect()
  })

  it('creates a template and a knowledge version', async () => {
    // Mock prisma injection by overriding module
    vi.doMock('@/lib/db/prisma', () => ({ prisma }))
    const { templateService } = await import('@/server/modules/templates/template.service')

    // Ensure minimal foreign keys exist: workspace and user
    const ws = await prisma.workspace.create({ data: { name: 'Test WS' } })
    const user = await prisma.user.create({ data: { email: 'a@b.com', display_name: 'A', password_hash: 'x' } })

    const res = await templateService.create({ workspaceId: ws.id, authorId: user.id, title: 'T', content: 'C' })
    expect(res.id).toBeTruthy()

    const versions = await prisma.knowledgeVersion.findMany({ where: { knowledgeId: res.id } })
    expect(versions.length).toBe(1)
    expect(versions[0].version_number).toBe(1)
  })
})

