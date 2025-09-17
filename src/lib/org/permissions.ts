import { rbacService } from '@/lib/auth/rbac.service'
import type { ACL, EffectivePermissionInput, PermissionAction, PermissionResource } from './types'

type Decision = 'allow' | 'deny' | 'none'

function evalAcl(acl: ACL | null | undefined, userId: string, userRoles: string[]): Decision {
  if (!acl) return 'none'
  if (acl.deny?.users?.includes(userId)) return 'deny'
  if (userRoles.some((r) => acl.deny?.roles?.includes(r))) return 'deny'
  if (acl.allow?.users?.includes(userId)) return 'allow'
  if (userRoles.some((r) => acl.allow?.roles?.includes(r))) return 'allow'
  return 'none'
}

export async function canUser(input: EffectivePermissionInput): Promise<boolean> {
  const { userId, workspaceId, resource, action, resourceAcl, parentAclChain } = input
  const roles = await rbacService.getUserRoles(userId, workspaceId)
  const roleNames = roles.map((r) => r.name)

  // 1) Hard deny on any ancestor or resource ACL
  for (const acl of parentAclChain ?? []) {
    const d = evalAcl(acl, userId, roleNames)
    if (d === 'deny') return false
  }
  if (evalAcl(resourceAcl ?? null, userId, roleNames) === 'deny') return false

  // 2) RBAC direct check
  const rbac = await rbacService.checkPermission({
    userId,
    workspaceId,
    resource: resource as unknown as string,
    action: action as unknown as string,
  })
  if (rbac.granted) return true

  // 3) Allow via ACLs
  for (const acl of parentAclChain ?? []) {
    const d = evalAcl(acl, userId, roleNames)
    if (d === 'allow') return true
  }
  if (evalAcl(resourceAcl ?? null, userId, roleNames) === 'allow') return true

  return false
}

export function requirePermission(input: EffectivePermissionInput): Promise<void> {
  return canUser(input).then((ok) => {
    if (!ok) {
      const { resource, action } = input
      const e = new Error(`Forbidden: ${action} ${resource}`)
      ;(e as any).status = 403
      throw e
    }
  })
}

export function buildParentChain(acls: (ACL | null | undefined)[]): ACL[] {
  return acls.filter((a): a is ACL => !!a)
}

