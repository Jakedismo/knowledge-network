"use client"
/* eslint-disable react/no-unescaped-entities */

import React from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Lock, Eye, EyeOff } from 'lucide-react'

// Base permission guard component
interface PermissionGuardProps {
  permission: string
  resource?: string
  workspaceId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
  showFallback?: boolean
}

export function PermissionGuard({
  permission,
  resource,
  workspaceId,
  fallback,
  children,
  showFallback = true
}: PermissionGuardProps) {
  const { hasPermission, user } = useAuth()

  const hasAccess = hasPermission(permission, resource)

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showFallback) {
      return null
    }

    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this content. Required permission: {permission}
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

// Role-based guard component
interface RoleGuardProps {
  role: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
  showFallback?: boolean
  requireAll?: boolean // For multiple roles, require all vs any
}

export function RoleGuard({
  role,
  fallback,
  children,
  showFallback = true,
  requireAll = false
}: RoleGuardProps) {
  const { hasRole, user } = useAuth()

  const roles = Array.isArray(role) ? role : [role]

  const hasAccess = requireAll
    ? roles.every(r => hasRole(r))
    : roles.some(r => hasRole(r))

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showFallback) {
      return null
    }

    const roleText = roles.length > 1
      ? `${roles.slice(0, -1).join(', ')} ${requireAll ? 'and' : 'or'} ${roles[roles.length - 1]}`
      : roles[0]

    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          You need the {roleText} role to access this content.
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

// Workspace membership guard
interface WorkspaceGuardProps {
  workspaceId: string
  minimumRole?: string
  fallback?: React.ReactNode
  children: React.ReactNode
  showFallback?: boolean
}

export function WorkspaceGuard({
  workspaceId,
  minimumRole,
  fallback,
  children,
  showFallback = true
}: WorkspaceGuardProps) {
  const { user } = useAuth()

  const workspace = user?.workspaces?.find(w => w.id === workspaceId)

  if (!workspace) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showFallback) {
      return null
    }

    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          You are not a member of this workspace.
        </AlertDescription>
      </Alert>
    )
  }

  // Check minimum role if specified
  if (minimumRole) {
    const roleHierarchy = {
      'VIEWER': 1,
      'CONTRIBUTOR': 2,
      'EDITOR': 3,
      'ADMIN': 4
    }

    const userRoleLevel = roleHierarchy[workspace.role as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[minimumRole as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < requiredLevel) {
      if (fallback) {
        return <>{fallback}</>
      }

      if (!showFallback) {
        return null
      }

      return (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You need at least {minimumRole} role in this workspace to access this content.
          </AlertDescription>
        </Alert>
      )
    }
  }

  return <>{children}</>
}

// Authentication guard
interface AuthGuardProps {
  fallback?: React.ReactNode
  children: React.ReactNode
  redirectToLogin?: boolean
}

export function AuthGuard({ fallback, children, redirectToLogin = true }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (redirectToLogin) {
      // In a real app, this would redirect to login
      return (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access this content.
            <Button variant="link" className="ml-2 p-0 h-auto">
              Sign in
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  return <>{children}</>
}

// Feature flag guard
interface FeatureGuardProps {
  feature: string
  fallback?: React.ReactNode
  children: React.ReactNode
  showFallback?: boolean
}

export function FeatureGuard({
  feature,
  fallback,
  children,
  showFallback = true
}: FeatureGuardProps) {
  // In a real app, this would check feature flags from user context or config
  const featureFlags = {
    'ai_features': true,
    'collaboration': true,
    'analytics': false,
    'advanced_search': true,
  }

  const isEnabled = featureFlags[feature as keyof typeof featureFlags] ?? false

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showFallback) {
      return null
    }

    return (
      <Alert>
        <EyeOff className="h-4 w-4" />
        <AlertDescription>
          This feature is not available in your current plan.
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

// Conditional render hook
export function usePermission(permission: string, resource?: string) {
  const { hasPermission } = useAuth()
  return hasPermission(permission, resource)
}

export function useRole(role: string | string[], requireAll = false) {
  const { hasRole } = useAuth()

  if (Array.isArray(role)) {
    return requireAll
      ? role.every(r => hasRole(r))
      : role.some(r => hasRole(r))
  }

  return hasRole(role)
}

export function useWorkspaceAccess(workspaceId: string, minimumRole?: string) {
  const { user } = useAuth()

  const workspace = user?.workspaces?.find(w => w.id === workspaceId)

  if (!workspace) return false

  if (!minimumRole) return true

  const roleHierarchy = {
    'VIEWER': 1,
    'CONTRIBUTOR': 2,
    'EDITOR': 3,
    'ADMIN': 4
  }

  const userRoleLevel = roleHierarchy[workspace.role as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[minimumRole as keyof typeof roleHierarchy] || 0

  return userRoleLevel >= requiredLevel
}

// High-order component for permission checking
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  resource?: string
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} resource={resource}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

// High-order component for role checking
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  role: string | string[],
  requireAll = false
) {
  return function RoleWrappedComponent(props: P) {
    return (
      <RoleGuard role={role} requireAll={requireAll}>
        <Component {...props} />
      </RoleGuard>
    )
  }
}

// Compound guard for complex permission logic
interface CompoundGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
  // Use render prop pattern for complex logic
  render?: (context: {
    hasPermission: (permission: string, resource?: string) => boolean
    hasRole: (role: string) => boolean
    user: any
  }) => boolean
}

export function CompoundGuard({
  children,
  fallback,
  showFallback = true,
  render
}: CompoundGuardProps) {
  const { hasPermission, hasRole, user } = useAuth()

  if (!render) {
    return <>{children}</>
  }

  const hasAccess = render({ hasPermission, hasRole, user })

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showFallback) {
      return null
    }

    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          You don't have the required permissions to access this content.
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}
