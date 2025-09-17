import { z } from 'zod';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  workspaceId?: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
  resourceId?: string;
}

export interface PermissionCheck {
  userId: string;
  resource: string;
  action: string;
  workspaceId?: string;
  resourceId?: string;
  context?: Record<string, any>;
}

export interface PermissionResult {
  granted: boolean;
  reason: 'direct_permission' | 'resource_permission' | 'contextual_permission' | 'no_permission';
  details?: string;
}

export interface UserWorkspaceRole {
  userId: string;
  workspaceId: string;
  roleId: string;
  grantedAt: Date;
  grantedBy?: string;
}

const permissionSchema = z.object({
  resource: z.string(),
  action: z.string(),
  conditions: z.record(z.any()).optional(),
  resourceId: z.string().optional(),
});

const roleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(permissionSchema),
});

export class RBACService {
  private static instance: RBACService;
  private permissionCache = new Map<string, Permission[]>();
  private roleCache = new Map<string, Role[]>();

  constructor() {
    // Initialize system roles
    this.initializeSystemRoles();
  }

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Check if a user has permission to perform an action
   */
  async checkPermission(check: PermissionCheck): Promise<PermissionResult> {
    const { userId, resource, action, workspaceId, resourceId, context } = check;

    try {
      // Get user permissions for the workspace
      const permissions = await this.getUserPermissions(userId, workspaceId);

      // Check direct permission
      const hasDirectPermission = this.hasDirectPermission(permissions, resource, action);
      if (hasDirectPermission) {
        return { granted: true, reason: 'direct_permission' };
      }

      // Check resource-specific permissions
      if (resourceId) {
        const hasResourcePermission = await this.checkResourcePermission(
          userId,
          resource,
          action,
          resourceId,
          workspaceId
        );
        if (hasResourcePermission) {
          return { granted: true, reason: 'resource_permission' };
        }
      }

      // Check contextual permissions (e.g., owner, author)
      const hasContextualPermission = await this.checkContextualPermission(
        userId,
        resource,
        action,
        resourceId,
        workspaceId,
        context
      );
      if (hasContextualPermission) {
        return { granted: true, reason: 'contextual_permission' };
      }

      return {
        granted: false,
        reason: 'no_permission',
        details: `User ${userId} lacks permission for ${action} on ${resource}`
      };
    } catch (error) {
      import { logger } from '@/lib/logger'
      logger.error('Permission check failed:', error);
      return {
        granted: false,
        reason: 'no_permission',
        details: 'Permission check failed due to system error'
      };
    }
  }

  /**
   * Get all roles for a user in a workspace
   */
  async getUserRoles(userId: string, workspaceId?: string): Promise<Role[]> {
    const cacheKey = `user_roles:${userId}:${workspaceId || 'global'}`;

    // Check cache first
    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!;
    }

    // TODO: Implement database query
    // For now, return default roles
    const roles: Role[] = [
      this.getSystemRole('user')
    ];

    // Cache for 15 minutes
    this.roleCache.set(cacheKey, roles);
    setTimeout(() => this.roleCache.delete(cacheKey), 15 * 60 * 1000);

    return roles;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string, workspaceId?: string): Promise<Permission[]> {
    const cacheKey = `user_permissions:${userId}:${workspaceId || 'global'}`;

    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    const roles = await this.getUserRoles(userId, workspaceId);
    const permissions: Permission[] = [];

    for (const role of roles) {
      permissions.push(...role.permissions);
    }

    // Remove duplicate permissions
    const uniquePermissions = Array.from(
      new Map(permissions.map(p => [`${p.resource}:${p.action}`, p])).values()
    );

    // Cache for 15 minutes
    this.permissionCache.set(cacheKey, uniquePermissions);
    setTimeout(() => this.permissionCache.delete(cacheKey), 15 * 60 * 1000);

    return uniquePermissions;
  }

  /**
   * Assign a role to a user in a workspace
   */
  async assignRole(userId: string, roleId: string, workspaceId: string, grantedBy?: string): Promise<void> {
    // TODO: Implement database operation
    // const assignment: UserWorkspaceRole = {
    //   userId,
    //   workspaceId,
    //   roleId,
    //   grantedAt: new Date(),
    //   grantedBy
    // };

    // Invalidate cache
    this.invalidateUserCache(userId, workspaceId);
  }

  /**
   * Remove a role from a user in a workspace
   */
  async removeRole(userId: string, roleId: string, workspaceId: string): Promise<void> {
    // TODO: Implement database operation

    // Invalidate cache
    this.invalidateUserCache(userId, workspaceId);
  }

  /**
   * Create a new role
   */
  async createRole(workspaceId: string, roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystemRole'>): Promise<Role> {
    // Validate role data
    const validatedData = roleSchema.parse(roleData);

    // Validate permissions
    this.validatePermissions(validatedData.permissions);

    const role: Role = {
      id: this.generateId(),
      ...validatedData,
      workspaceId,
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // TODO: Save to database

    return role;
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: string, updateData: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystemRole'>>): Promise<Role> {
    if (updateData.permissions) {
      this.validatePermissions(updateData.permissions);
    }

    // TODO: Update in database
    // const role = await this.roleRepository.update(roleId, updateData);

    // Invalidate all affected user caches
    this.invalidateRoleCache(roleId);

    // Return updated role (placeholder)
    return this.getSystemRole('user');
  }

  /**
   * Get available resources and actions
   */
  getAvailablePermissions(): { resources: string[]; actions: string[] } {
    return {
      resources: [
        'knowledge',
        'workspace',
        'user',
        'tag',
        'collection',
        'comment',
        'search',
        'analytics',
        'integration',
        'admin'
      ],
      actions: [
        'create',
        'read',
        'update',
        'delete',
        'share',
        'comment',
        'admin',
        'manage'
      ]
    };
  }

  /**
   * Check if user has direct permission
   */
  private hasDirectPermission(permissions: Permission[], resource: string, action: string): boolean {
    return permissions.some(permission =>
      (permission.resource === '*' || permission.resource === resource) &&
      (permission.action === '*' || permission.action === action)
    );
  }

  /**
   * Check resource-specific permissions
   */
  private async checkResourcePermission(
    userId: string,
    resource: string,
    action: string,
    resourceId: string,
    workspaceId?: string
  ): Promise<boolean> {
    // TODO: Implement resource-specific permission checking
    // This would check if user has specific permissions on a particular resource
    return false;
  }

  /**
   * Check contextual permissions (ownership, authorship, etc.)
   */
  private async checkContextualPermission(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    workspaceId?: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    // Author permissions - users can edit their own content
    if (resource === 'knowledge' && (action === 'update' || action === 'delete') && resourceId) {
      // TODO: Check if user is the author of the knowledge
      // const knowledge = await this.knowledgeRepository.findById(resourceId);
      // return knowledge?.authorId === userId;
    }

    // Workspace member permissions
    if (workspaceId) {
      // TODO: Check if user is a workspace member
      // const isMember = await this.isWorkspaceMember(userId, workspaceId);
      // return isMember;
    }

    return false;
  }

  /**
   * Validate permissions array
   */
  private validatePermissions(permissions: Permission[]): void {
    const { resources, actions } = this.getAvailablePermissions();

    for (const permission of permissions) {
      if (permission.resource !== '*' && !resources.includes(permission.resource)) {
        throw new Error(`Invalid resource: ${permission.resource}`);
      }

      if (permission.action !== '*' && !actions.includes(permission.action)) {
        throw new Error(`Invalid action: ${permission.action}`);
      }
    }
  }

  /**
   * Initialize system roles
   */
  private initializeSystemRoles(): void {
    // Define system roles that are available across all workspaces
    const systemRoles = {
      admin: {
        id: 'system-admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: [{ resource: '*', action: '*' }],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      user: {
        id: 'system-user',
        name: 'User',
        description: 'Basic user access',
        permissions: [
          { resource: 'knowledge', action: 'read' },
          { resource: 'knowledge', action: 'create' },
          { resource: 'knowledge', action: 'update' },
          { resource: 'search', action: 'read' },
          { resource: 'tag', action: 'read' },
          { resource: 'collection', action: 'read' }
        ],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      viewer: {
        id: 'system-viewer',
        name: 'Viewer',
        description: 'Read-only access',
        permissions: [
          { resource: 'knowledge', action: 'read' },
          { resource: 'search', action: 'read' },
          { resource: 'tag', action: 'read' },
          { resource: 'collection', action: 'read' }
        ],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    // Store in memory (in production, these would be in database)
    this.systemRoles = systemRoles;
  }

  private systemRoles: Record<string, any> = {};

  /**
   * Get a system role by name
   */
  private getSystemRole(name: string): Role {
    return this.systemRoles[name] || this.systemRoles.user;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `role_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Invalidate user permission cache
   */
  private invalidateUserCache(userId: string, workspaceId?: string): void {
    const patterns = [
      `user_permissions:${userId}:${workspaceId || 'global'}`,
      `user_roles:${userId}:${workspaceId || 'global'}`
    ];

    patterns.forEach(pattern => {
      this.permissionCache.delete(pattern);
      this.roleCache.delete(pattern);
    });
  }

  /**
   * Invalidate role cache when role is updated
   */
  private invalidateRoleCache(roleId: string): void {
    // In a full implementation, you'd query which users have this role
    // and invalidate their caches accordingly
    this.permissionCache.clear();
    this.roleCache.clear();
  }
}

// Export singleton instance
export const rbacService = RBACService.getInstance();
