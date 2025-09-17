import { gql } from '@apollo/client'

// Authentication Mutations
export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        displayName
        avatarUrl
        status
        roles
        permissions
        workspaces {
          id
          name
          role
        }
      }
    }
  }
`

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        displayName
        avatarUrl
        status
        roles
        permissions
      }
    }
  }
`

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
      expiresAt
    }
  }
`

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`

export const LOGOUT_ALL_SESSIONS = gql`
  mutation LogoutAllSessions {
    logoutAllSessions
  }
`

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`

export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        displayName
      }
    }
  }
`

export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      email
      displayName
      avatarUrl
      bio
      location
      status
    }
  }
`

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      user {
        id
        email
        emailVerified
      }
    }
  }
`

export const RESEND_VERIFICATION_EMAIL = gql`
  mutation ResendVerificationEmail {
    resendVerificationEmail
  }
`

// MFA Mutations
export const SETUP_MFA = gql`
  mutation SetupMFA {
    setupMFA {
      secret
      qrCode
      backupCodes
    }
  }
`

export const VERIFY_MFA_SETUP = gql`
  mutation VerifyMFASetup($token: String!) {
    verifyMFASetup(token: $token) {
      user {
        id
        mfaEnabled
      }
      backupCodes
    }
  }
`

export const DISABLE_MFA = gql`
  mutation DisableMFA($password: String!) {
    disableMFA(password: $password) {
      user {
        id
        mfaEnabled
      }
    }
  }
`

export const VERIFY_MFA = gql`
  mutation VerifyMFA($token: String!) {
    verifyMFA(token: $token) {
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        displayName
        avatarUrl
        status
        roles
        permissions
      }
    }
  }
`

export const REGENERATE_BACKUP_CODES = gql`
  mutation RegenerateBackupCodes {
    regenerateBackupCodes
  }
`

// OAuth Mutations
export const OAUTH_LOGIN = gql`
  mutation OAuthLogin($provider: String!, $code: String!, $state: String) {
    oauthLogin(provider: $provider, code: $code, state: $state) {
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        displayName
        avatarUrl
        status
        authProvider
      }
    }
  }
`

export const LINK_OAUTH_ACCOUNT = gql`
  mutation LinkOAuthAccount($provider: String!, $code: String!) {
    linkOAuthAccount(provider: $provider, code: $code) {
      user {
        id
        linkedAccounts {
          provider
          email
          linkedAt
        }
      }
    }
  }
`

export const UNLINK_OAUTH_ACCOUNT = gql`
  mutation UnlinkOAuthAccount($provider: String!) {
    unlinkOAuthAccount(provider: $provider) {
      user {
        id
        linkedAccounts {
          provider
          email
          linkedAt
        }
      }
    }
  }
`

// Session Management
export const GET_ACTIVE_SESSIONS = gql`
  query GetActiveSessions {
    activeSessions {
      id
      deviceInfo {
        userAgent
        ip
        platform
        browser
      }
      createdAt
      lastActivity
      isCurrentSession
    }
  }
`

export const REVOKE_SESSION = gql`
  mutation RevokeSession($sessionId: String!) {
    revokeSession(sessionId: $sessionId)
  }
`

// TypeScript interfaces for mutation inputs
export interface LoginInput {
  email: string
  password: string
  rememberMe?: boolean
  mfaToken?: string
}

export interface RegisterInput {
  email: string
  password: string
  displayName: string
  acceptTerms: boolean
  workspaceInvite?: string
}

export interface ResetPasswordInput {
  token: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: AuthUser
}

export interface AuthUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  status: string
  roles: string[]
  permissions: string[]
  workspaces?: WorkspaceMembership[]
  mfaEnabled?: boolean
  emailVerified?: boolean
  authProvider?: string
  linkedAccounts?: LinkedAccount[]
}

export interface WorkspaceMembership {
  id: string
  name: string
  role: string
}

export interface LinkedAccount {
  provider: string
  email: string
  linkedAt: string
}

export interface SessionInfo {
  id: string
  deviceInfo: {
    userAgent: string
    ip: string
    platform: string
    browser: string
  }
  createdAt: string
  lastActivity: string
  isCurrentSession: boolean
}

export interface MFASetup {
  secret: string
  qrCode: string
  backupCodes: string[]
}