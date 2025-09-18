import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db/prisma'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export interface AuthContext {
  userId: string
  roles: string[]
  workspaceId?: string
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required')
  }

  try {
    const decoded = await verifyJWT(authHeader.slice('Bearer '.length))
    const userId = decoded?.sub as string | undefined
    if (!userId) {
      throw new HttpError(401, 'Invalid token')
    }
    return {
      userId,
      roles: Array.isArray(decoded?.roles) ? decoded.roles : [],
      workspaceId: typeof decoded?.workspaceId === 'string' ? decoded.workspaceId : undefined,
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(401, 'Invalid or expired token')
  }
}

export async function requireWorkspaceAccess(auth: AuthContext, workspaceId: string): Promise<void> {
  if (auth.roles.includes('ADMIN') || auth.roles.includes('SUPERADMIN')) return
  if (auth.workspaceId && auth.workspaceId === workspaceId) return

  const membership = await prisma.userWorkspaceRole.findFirst({
    where: { userId: auth.userId, workspaceId },
    select: { userId: true },
  })
  if (membership) return

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } })
  if (workspace?.ownerId === auth.userId) return

  throw new HttpError(403, 'Forbidden')
}

