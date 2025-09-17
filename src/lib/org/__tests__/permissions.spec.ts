import { describe, it, expect } from 'vitest'
import { canUser } from '../../org/permissions'

// Mock RBAC
vi.mock('../../auth/rbac.service', () => {
  return {
    rbacService: {
      getUserRoles: async (_userId: string, _workspaceId?: string) => [
        { id: 'r1', name: 'User', description: '', permissions: [], isSystemRole: false, createdAt: new Date(), updatedAt: new Date() },
      ],
      checkPermission: async () => ({ granted: false, reason: 'no_permission' as const }),
    },
  }
})

describe('Permission inheritance', () => {
  it('denies when any parent ACL denies', async () => {
    const ok = await canUser({
      userId: 'u1',
      workspaceId: 'ws1',
      resource: 'collection',
      action: 'read',
      resourceAcl: { allow: { users: [], roles: [] }, deny: { users: [], roles: [] } },
      parentAclChain: [
        { allow: { users: [], roles: [] }, deny: { users: ['u1'], roles: [] } },
      ],
    })
    expect(ok).toBe(false)
  })

  it('allows when parent allows and no deny', async () => {
    const ok = await canUser({
      userId: 'u1',
      workspaceId: 'ws1',
      resource: 'collection',
      action: 'read',
      resourceAcl: { allow: { users: [], roles: [] }, deny: { users: [], roles: [] } },
      parentAclChain: [
        { allow: { users: ['u1'], roles: [] }, deny: { users: [], roles: [] } },
      ],
    })
    expect(ok).toBe(true)
  })
})

