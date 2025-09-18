import { jwtService } from './jwt.service'

export async function verifyJWT(token: string): Promise<any> {
  const requireRbac = (process.env.AI_REQUIRE_RBAC ?? '0') === '1'
  if (!requireRbac) {
    // Dev/guest mode: accept any token and return a minimal payload
    const workspaceId = process.env.NEXT_PUBLIC_DEV_WORKSPACE_ID || 'default-workspace'
    return {
      sub: 'dev-user',
      email: 'dev@example.com',
      sessionId: 'dev-session',
      workspaceId,
      roles: ['USER'],
      permissions: [{ resource: 'knowledge', action: 'read' }, { resource: 'knowledge', action: 'create' }],
      type: 'access',
      role: 'USER',
    }
  }
  const payload = await jwtService.verifyAccessToken(token)
  const role = payload.roles?.includes('ADMIN') ? 'ADMIN' : 'USER'
  return { ...payload, role }
}
