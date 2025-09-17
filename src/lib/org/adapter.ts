import type { OrgService } from './service'
import { orgService as inMemory } from './service'
import { createPrismaOrgService } from './prisma-adapter'

let cached: OrgService | null = null

export async function resolveOrgService(): Promise<OrgService> {
  if (cached) return cached
  const usePrisma = process.env.ORG_ADAPTER === 'prisma'
  if (usePrisma) {
    try {
      // Avoid static import to keep type-checking happy if @prisma/client is missing
      // eslint-disable-next-line no-implied-eval
      const req: any = (0, eval)('require')
      const { PrismaClient } = req('@prisma/client')
      const prisma = new PrismaClient()
      cached = createPrismaOrgService(prisma as any)
      return cached
    } catch {
      // Fallback silently to in-memory
    }
  }
  cached = inMemory
  return cached
}
