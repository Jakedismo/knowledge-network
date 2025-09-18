import { PrismaClient } from '../../../generated/prisma-client'

// Ensure a single PrismaClient across hot-reloads in dev and serverless contexts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type DB = typeof prisma

