// Authentication Components Export Index

// Core authentication forms
export { LoginForm } from './login-form'
export { RegisterForm } from './register-form'
export { ForgotPasswordForm, ResetPasswordForm } from './forgot-password-form'

// Layout and container components
export { AuthLayout, AuthPage } from './auth-layout'

// User profile and settings
export { UserProfile } from './user-profile'

// Permission and role-based guards
export {
  PermissionGuard,
  RoleGuard,
  WorkspaceGuard,
  AuthGuard,
  FeatureGuard,
  CompoundGuard,
  usePermission,
  useRole,
  useWorkspaceAccess,
  withPermission,
  withRole
} from './permission-guards'

// SSO and OAuth integration
export {
  SSOProviderList,
  SSOCallback,
  AccountLinking,
  EnterpriseSSOConfig,
  useOAuthFlow
} from './sso-integration'

// Security components
export {
  TwoFactorSetup,
  ActiveSessions,
  SecurityNotifications,
  SecurityDashboard
} from './security-components'

// Authentication context and hooks
export {
  AuthProvider,
  useAuth,
  withAuth,
  PermissionGuard as PermissionGuardComponent,
  RoleGuard as RoleGuardComponent
} from '../../lib/auth/auth-context'

// Types and interfaces
export type {
  AuthUser,
  AuthResponse,
  LoginInput,
  RegisterInput,
  SessionInfo,
  LinkedAccount,
  MFASetup
} from '../../lib/graphql/auth-mutations'