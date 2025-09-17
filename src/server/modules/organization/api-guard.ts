import { NextResponse } from 'next/server'
import { aclService } from './acl.service'
import { OrgPermission, OrgResourceType } from './models'
import jwt from 'jsonwebtoken'

export interface GuardContext {
  userId: string
  workspaceId?: string
}

// Header-based lightweight guard to avoid coupling with unfinished auth modules.
// Accepts `Authorization: Bearer <opaque>` (ignored here) and uses:
// - `x-user-id`: required
// - `x-workspace-id`: optional for resource-scoped checks
export async function requireAuth(req: Request): Promise<GuardContext | InstanceType<typeof NextResponse>> {
  // Prefer JWT from Authorization header; fallback to x-user-id for scaffolding
  const auth = req.headers.get('authorization') ?? ''
  const token = /^Bearer\s+(.+)$/i.test(auth) ? auth.replace(/^Bearer\s+/i, '') : ''
  const secret = process.env.JWT_SECRET
  if (token && secret) {
    try {
      const payload = jwt.verify(token, secret) as { sub?: string; workspaceId?: string }
      if (payload?.sub) {
        const ctx: GuardContext = { userId: payload.sub }
        if (payload.workspaceId !== undefined) ctx.workspaceId = payload.workspaceId
        return ctx
      }
    } catch {
      // fall through to header-based fallback
    }
  }
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const workspaceId = req.headers.get('x-workspace-id') ?? undefined
  const ctx: GuardContext = { userId }
  if (workspaceId !== undefined) ctx.workspaceId = workspaceId
  return ctx
}

export async function requireAccess(
  req: Request,
  action: OrgPermission | string,
  resourceType: OrgResourceType,
  resourceId?: string
): Promise<GuardContext | InstanceType<typeof NextResponse>> {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  // If no workspace context, allow for now (e.g., workspace creation)
  if (!ctx.workspaceId) return ctx
  const ok = await aclService.checkAccess({
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
    resourceType,
    action,
    ...(resourceId ? { resourceId } : {}),
  })
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return ctx
}
