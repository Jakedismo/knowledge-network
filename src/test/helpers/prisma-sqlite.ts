export async function getSqlitePrismaClient(): Promise<any | null> {
  try {
    // Dynamically import generated client if present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clientMod = require('../../../generated/prisma-sqlite-client')
    const Client = clientMod.PrismaClient || clientMod.default?.PrismaClient
    if (!Client) return null
    const prisma = new Client({ datasources: { db: { url: 'file:./prisma/.sqlite-tmp/dev.db' } } })
    return prisma
  } catch {
    return null
  }
}

