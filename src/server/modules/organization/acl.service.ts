import { prisma } from '@/lib/db/prisma'
import { rbacService } from '@/lib/auth/rbac.service'
import { OrgPermission, OrgResourceType, AccessCheck } from './models'

// Inheritance order: WORKSPACE -> COLLECTION -> KNOWLEDGE
const RESOURCE_DEPTH: Record<OrgResourceType, number> = {
  [OrgResourceType.WORKSPACE]: 0,
  [OrgResourceType.COLLECTION]: 1,
  [OrgResourceType.KNOWLEDGE]: 2,
}

function normalize(actions: (string | OrgPermission)[]): string[] {
  return actions.map(String)
}

export class ACLService {
  async checkAccess(input: AccessCheck): Promise<boolean> {
    const { userId, workspaceId, resourceType, resourceId, action } = input

    // 1) System/RBAC direct permission
    const base: any = { userId, resource: resourceType.toLowerCase(), action: String(action) }
    if (workspaceId) base.workspaceId = workspaceId
    if (resourceId) base.resourceId = resourceId
    const r = await rbacService.checkPermission(base)
    if (r.granted) return true

    // 2) ACE entries lookup with inheritance
    // Collect applicable ACE candidates from most specific to general
    const whereBase = { workspaceId }
    const candidates = await prisma.accessControlEntry.findMany({
      where: {
        ...whereBase,
        resourceType,
        OR: [
          { resourceId: resourceId ?? null }, // specific or workspace-wide when null
          resourceId ? { resourceId: null } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (candidates.length === 0) return false

    // Resolve subjects: user and user roles
    const roles = await rbacService.getUserRoles(userId, workspaceId)
    const roleIds = roles.map((x) => x.id)

    const actions = new Set<string>([String(action)])

    // Check user-specific ACE first, then role-based
    for (const ace of candidates) {
      const perms = normalize(ace.permissions as unknown as (string | OrgPermission)[])
      const hasAction = perms.includes('*') || perms.includes(String(action))
      if (!hasAction) continue

      // Match subject
      if (ace.subjectType === 'USER' && ace.subjectId === userId) return true
      if (ace.subjectType === 'ROLE' && roleIds.includes(ace.subjectId)) return true
    }

    // 3) Inherit rules: walk up the tree for collection/knowledge
    if (resourceId && (resourceType === OrgResourceType.COLLECTION || resourceType === OrgResourceType.KNOWLEDGE)) {
      const parentCollectionId = await this.getParentCollectionId(resourceType, resourceId)
      if (parentCollectionId) {
        return this.checkAccess({ userId, workspaceId, resourceType: OrgResourceType.COLLECTION, resourceId: parentCollectionId, action })
      }
      // Fall back to workspace-scope ACEs already considered above
    }

    return false
  }

  private async getParentCollectionId(resourceType: OrgResourceType, resourceId: string): Promise<string | null> {
    if (resourceType === OrgResourceType.COLLECTION) {
      const c = await prisma.collection.findUnique({ where: { id: resourceId }, select: { parentId: true } })
      return c?.parentId ?? null
    }
    if (resourceType === OrgResourceType.KNOWLEDGE) {
      const k = await prisma.knowledge.findUnique({ where: { id: resourceId }, select: { collectionId: true } })
      return k?.collectionId ?? null
    }
    return null
  }
}

export const aclService = new ACLService()
