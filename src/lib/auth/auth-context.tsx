"use client"

import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
  LOGIN,
  LOGOUT,
  REFRESH_TOKEN,
  GET_ACTIVE_SESSIONS,
  REGISTER,
  type AuthUser,
  type AuthResponse,
  type LoginInput,
  type RegisterInput
} from '@/lib/graphql/auth-mutations'
import { GET_ME } from '@/lib/graphql/queries'

// Auth state types
interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  accessToken: string | null
  refreshToken: string | null
  mfaRequired: boolean
  sessionId: string | null
}

// Auth actions
type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: AuthResponse }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_MFA_REQUIRED'; payload: { sessionId: string } }
  | { type: 'AUTH_TOKEN_REFRESHED'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'AUTH_USER_UPDATED'; payload: AuthUser }

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null,
  refreshToken: null,
  mfaRequired: false,
  sessionId: null,
}

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      }

    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        mfaRequired: false,
        error: null,
      }

    case 'AUTH_ERROR':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: action.payload,
        mfaRequired: false,
      }

    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      }

    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }

    case 'AUTH_MFA_REQUIRED':
      return {
        ...state,
        isLoading: false,
        mfaRequired: true,
        sessionId: action.payload.sessionId,
        error: null,
      }

    case 'AUTH_TOKEN_REFRESHED':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        error: null,
      }

    case 'AUTH_USER_UPDATED':
      return {
        ...state,
        user: action.payload,
      }

    default:
      return state
  }
}

// Auth context interface
interface AuthContextType extends AuthState {
  login: (credentials: LoginInput) => Promise<void>
  logout: () => Promise<void>
  logoutAllSessions: () => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  clearError: () => void
  refreshTokens: () => Promise<void>
  updateUser: (user: AuthUser) => void
  hasPermission: (permission: string, resource?: string) => boolean
  hasRole: (role: string) => boolean
  getCurrentWorkspace: () => string | null
  switchWorkspace: (workspaceId: string) => Promise<void>
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Token storage utilities
const TOKEN_STORAGE_KEY = 'auth_tokens'
const REFRESH_TOKEN_KEY = 'refresh_token'

function getStoredTokens() {
  if (typeof window === 'undefined') return null

  try {
    const tokens = localStorage.getItem(TOKEN_STORAGE_KEY)
    return tokens ? JSON.parse(tokens) : null
  } catch {
    return null
  }
}

function storeTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return

  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
    accessToken,
    refreshToken,
    timestamp: Date.now()
  }))
}

function clearStoredTokens() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// Auth provider component
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const router = useRouter()

  // GraphQL mutations
  const [loginMutation] = useMutation(LOGIN)
  const [logoutMutation] = useMutation(LOGOUT)
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN)
  const [registerMutation] = useMutation(REGISTER)

  // Get current user query
  const { data: currentUserData, refetch: refetchUser } = useQuery(GET_ME, {
    skip: !state.accessToken,
    errorPolicy: 'ignore',
  })

  // Initialize auth state from stored tokens
  useEffect(() => {
    const storedTokens = getStoredTokens()

    if (storedTokens?.accessToken && storedTokens?.refreshToken) {
      // Verify tokens are still valid by fetching current user
      refetchUser()
        .then((result) => {
          if (result.data?.me) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                accessToken: storedTokens.accessToken,
                refreshToken: storedTokens.refreshToken,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
                user: result.data.me,
              }
            })
          } else {
            clearStoredTokens()
            dispatch({ type: 'AUTH_LOGOUT' })
          }
        })
        .catch(() => {
          clearStoredTokens()
          dispatch({ type: 'AUTH_LOGOUT' })
        })
    } else {
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [refetchUser])

  // Auto-refresh tokens
  useEffect(() => {
    if (!state.accessToken || !state.refreshToken) return

    const refreshInterval = setInterval(async () => {
      try {
        await refreshTokens()
      } catch (error) {
        logger.error?.('Token refresh failed:', error)
        logout()
      }
    }, 14 * 60 * 1000) // Refresh every 14 minutes

    return () => clearInterval(refreshInterval)
  }, [state.accessToken, state.refreshToken, refreshTokens, logout])

  // Auth methods
  const login = async (credentials: LoginInput) => {
    dispatch({ type: 'AUTH_LOADING' })

    try {
      const { data } = await loginMutation({
        variables: { input: credentials }
      })

      if (data?.login) {
        const authResponse = data.login
        storeTokens(authResponse.accessToken, authResponse.refreshToken)
        dispatch({ type: 'AUTH_SUCCESS', payload: authResponse })

        // Redirect to dashboard or intended page
        const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
        router.push(redirectTo)
      }
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message || 'Login failed'

      // Handle MFA requirement
      if (error?.graphQLErrors?.[0]?.extensions?.code === 'MFA_REQUIRED') {
        dispatch({
          type: 'AUTH_MFA_REQUIRED',
          payload: { sessionId: error.graphQLErrors[0].extensions.sessionId }
        })
        return
      }

      dispatch({ type: 'AUTH_ERROR', payload: errorMessage })
    }
  }

  const logout = async () => {
    try {
      await logoutMutation()
    } catch (error) {
      // Continue with logout even if server request fails
      logger.error?.('Logout request failed:', error)
    }

    clearStoredTokens()
    dispatch({ type: 'AUTH_LOGOUT' })
    router.push('/auth/login')
  }

  const logoutAllSessions = async () => {
    try {
      await logoutMutation({
        variables: { allSessions: true }
      })
    } catch (error) {
      logger.error?.('Logout all sessions failed:', error)
    }

    clearStoredTokens()
    dispatch({ type: 'AUTH_LOGOUT' })
    router.push('/auth/login')
  }

  const register = async (data: RegisterInput) => {
    dispatch({ type: 'AUTH_LOADING' })

    try {
      const { data: result } = await registerMutation({
        variables: { input: data }
      })

      if (result?.register) {
        const authResponse = result.register
        storeTokens(authResponse.accessToken, authResponse.refreshToken)
        dispatch({ type: 'AUTH_SUCCESS', payload: authResponse })
        router.push('/dashboard')
      }
    } catch (error: any) {
      const errorMessage = error?.graphQLErrors?.[0]?.message || 'Registration failed'
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage })
    }
  }

  const refreshTokens = async () => {
    if (!state.refreshToken) throw new Error('No refresh token available')

    try {
      const { data } = await refreshTokenMutation({
        variables: { refreshToken: state.refreshToken }
      })

      if (data?.refreshToken) {
        const { accessToken, refreshToken } = data.refreshToken
        storeTokens(accessToken, refreshToken)
        dispatch({
          type: 'AUTH_TOKEN_REFRESHED',
          payload: { accessToken, refreshToken }
        })
      }
    } catch (error) {
      clearStoredTokens()
      dispatch({ type: 'AUTH_LOGOUT' })
      throw error
    }
  }

  const clearError = () => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' })
  }

  const updateUser = (user: AuthUser) => {
    dispatch({ type: 'AUTH_USER_UPDATED', payload: user })
  }

  // Permission and role checking
  const hasPermission = (permission: string, resource?: string): boolean => {
    if (!state.user?.permissions) return false

    // Check direct permission
    if (state.user.permissions.includes(permission)) return true

    // Check wildcard permissions
    if (state.user.permissions.includes('*')) return true

    // Check resource-specific permissions
    if (resource && state.user.permissions.includes(`${resource}:${permission}`)) return true

    return false
  }

  const hasRole = (role: string): boolean => {
    if (!state.user?.roles) return false
    return state.user.roles.includes(role)
  }

  const getCurrentWorkspace = (): string | null => {
    // Implementation would depend on how workspace context is managed
    // For now, return the first workspace if available
    return state.user?.workspaces?.[0]?.id || null
  }

  const switchWorkspace = async (workspaceId: string) => {
    // Implementation would involve updating user context with new workspace
    // This would typically require a separate API call
    logger.info?.('Switching to workspace:', workspaceId)
  }

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    logoutAllSessions,
    register,
    clearError,
    refreshTokens,
    updateUser,
    hasPermission,
    hasRole,
    getCurrentWorkspace,
    switchWorkspace,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// HOC for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        const currentPath = window.location.pathname
        router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`)
      }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
      return <div>Loading...</div> // You can replace with a proper loading component
    }

    if (!isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }
}

// Permission guard component
interface PermissionGuardProps {
  permission: string
  resource?: string
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({
  permission,
  resource,
  fallback = null,
  children
}: PermissionGuardProps) {
  const { hasPermission } = useAuth()

  if (!hasPermission(permission, resource)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Role guard component
interface RoleGuardProps {
  role: string
  fallback?: ReactNode
  children: ReactNode
}

export function RoleGuard({ role, fallback = null, children }: RoleGuardProps) {
  const { hasRole } = useAuth()

  if (!hasRole(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
