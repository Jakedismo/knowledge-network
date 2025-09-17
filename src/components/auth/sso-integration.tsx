"use client"

import React, { useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { useRouter } from 'next/navigation'
import {
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Building,
  User,
  Mail,
  Unlink
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  OAUTH_LOGIN,
  LINK_OAUTH_ACCOUNT,
  UNLINK_OAUTH_ACCOUNT,
  type LinkedAccount
} from '@/lib/graphql/auth-mutations'
import { useAuth } from '@/lib/auth/auth-context'

// OAuth provider configuration
interface OAuthProvider {
  id: string
  name: string
  displayName: string
  description: string
  icon: React.ReactNode
  color: string
  enabled: boolean
  scopes?: string[]
}

const oauthProviders: OAuthProvider[] = [
  {
    id: 'google',
    name: 'google',
    displayName: 'Google',
    description: 'Sign in with your Google account',
    color: '#4285F4',
    enabled: true,
    scopes: ['openid', 'profile', 'email'],
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  {
    id: 'microsoft',
    name: 'microsoft',
    displayName: 'Microsoft',
    description: 'Sign in with your Microsoft account',
    color: '#00a1f1',
    enabled: true,
    scopes: ['openid', 'profile', 'email'],
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" fill="#00a1f1"/>
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    description: 'Sign in with your GitHub account',
    color: '#333',
    enabled: true,
    scopes: ['user:email'],
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    id: 'azure',
    name: 'azure',
    displayName: 'Azure AD',
    description: 'Sign in with your Azure Active Directory account',
    color: '#0078d4',
    enabled: true,
    scopes: ['openid', 'profile', 'email'],
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path d="M12 0L1.608 9.831l2.039 12.184L12 24l8.353-1.985L22.392 9.831z" fill="#0078d4"/>
      </svg>
    ),
  },
  {
    id: 'saml',
    name: 'saml',
    displayName: 'SAML SSO',
    description: 'Sign in with your enterprise SAML provider',
    color: '#6366f1',
    enabled: true,
    icon: (
      <Building className="w-5 h-5" />
    ),
  },
]

// SSO Button component
interface SSOButtonProps {
  provider: OAuthProvider
  onClick: () => void
  loading?: boolean
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

function SSOButton({ provider, onClick, loading = false, variant = 'outline', size = 'default' }: SSOButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={!provider.enabled || loading}
      className="w-full justify-start"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <span className="mr-2">{provider.icon}</span>
      )}
      Continue with {provider.displayName}
    </Button>
  )
}

// SSO Provider List for login/register
interface SSOProviderListProps {
  onProviderSelect: (providerId: string) => void
  loading?: string | null
  title?: string
  showDivider?: boolean
}

export function SSOProviderList({
  onProviderSelect,
  loading,
  title = "Or continue with",
  showDivider = true
}: SSOProviderListProps) {
  const enabledProviders = oauthProviders.filter(p => p.enabled)

  return (
    <div className="space-y-4">
      {showDivider && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {title}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {enabledProviders.map((provider) => (
          <SSOButton
            key={provider.id}
            provider={provider}
            onClick={() => onProviderSelect(provider.id)}
            loading={loading === provider.id}
          />
        ))}
      </div>
    </div>
  )
}

// SSO Callback Handler component
interface SSOCallbackProps {
  provider?: string
  code?: string
  state?: string
  error?: string
}

export function SSOCallback({ provider, code, state, error }: SSOCallbackProps) {
  const router = useRouter()
  const { updateUser } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [oauthLogin] = useMutation(OAUTH_LOGIN, {
    onCompleted: (data) => {
      if (data.oauthLogin) {
        updateUser(data.oauthLogin.user)
        setStatus('success')
        // Redirect after a short delay
        setTimeout(() => {
          const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
          router.push(redirectTo)
        }, 1500)
      }
    },
    onError: (error) => {
      setStatus('error')
      setErrorMessage(error.graphQLErrors?.[0]?.message || 'Authentication failed')
    }
  })

  useEffect(() => {
    if (error) {
      setStatus('error')
      setErrorMessage(decodeURIComponent(error))
      return
    }

    if (provider && code) {
      oauthLogin({
        variables: {
          provider,
          code,
          state: state || undefined
        }
      })
    } else {
      setStatus('error')
      setErrorMessage('Missing authentication parameters')
    }
  }, [provider, code, state, error, oauthLogin])

  const providerData = oauthProviders.find(p => p.id === provider)

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          {providerData?.icon}
          <span>Authenticating with {providerData?.displayName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">
              Please wait while we complete your authentication...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-8 w-8 text-success-600 mx-auto" />
            <p className="text-muted-foreground">
              Authentication successful! Redirecting you to the dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Account Linking component for user settings
interface AccountLinkingProps {
  linkedAccounts?: LinkedAccount[]
  onAccountLinked?: (account: LinkedAccount) => void
  onAccountUnlinked?: (provider: string) => void
}

export function AccountLinking({
  linkedAccounts = [],
  onAccountLinked,
  onAccountUnlinked
}: AccountLinkingProps) {
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null)
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null)

  const [linkAccount] = useMutation(LINK_OAUTH_ACCOUNT, {
    onCompleted: (data) => {
      if (data.linkOAuthAccount) {
        onAccountLinked?.(data.linkOAuthAccount.user.linkedAccounts[0])
        setLinkingProvider(null)
      }
    },
    onError: (error) => {
      console.error('Account linking failed:', error)
      setLinkingProvider(null)
    }
  })

  const [unlinkAccount] = useMutation(UNLINK_OAUTH_ACCOUNT, {
    onCompleted: () => {
      if (unlinkingProvider) {
        onAccountUnlinked?.(unlinkingProvider)
        setUnlinkingProvider(null)
      }
    },
    onError: (error) => {
      console.error('Account unlinking failed:', error)
      setUnlinkingProvider(null)
    }
  })

  const handleLinkAccount = (providerId: string) => {
    setLinkingProvider(providerId)
    // Redirect to OAuth provider
    window.location.href = `/api/auth/oauth/${providerId}?action=link`
  }

  const handleUnlinkAccount = (providerId: string) => {
    setUnlinkingProvider(providerId)
    unlinkAccount({
      variables: { provider: providerId }
    })
  }

  const isLinked = (providerId: string) => {
    return linkedAccounts.some(account => account.provider === providerId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Connected Accounts</span>
        </CardTitle>
        <CardDescription>
          Link your social accounts for easier sign-in and enhanced security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {oauthProviders.filter(p => p.enabled && p.id !== 'saml').map((provider) => {
          const linked = isLinked(provider.id)
          const linkedAccount = linkedAccounts.find(a => a.provider === provider.id)

          return (
            <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-muted">
                  {provider.icon}
                </div>
                <div>
                  <h4 className="font-medium">{provider.displayName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {linked
                      ? `Connected as ${linkedAccount?.email}`
                      : provider.description
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {linked && (
                  <Badge variant="outline" className="text-success-600 border-success-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}

                {linked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlinkAccount(provider.id)}
                    loading={unlinkingProvider === provider.id}
                    disabled={unlinkingProvider === provider.id}
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLinkAccount(provider.id)}
                    loading={linkingProvider === provider.id}
                    disabled={linkingProvider === provider.id}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Linking additional accounts provides backup authentication methods and can help prevent account lockout.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

// Enterprise SSO Configuration (for workspace admins)
interface EnterpriseSSOProps {
  workspaceId: string
  ssoEnabled?: boolean
  ssoProvider?: string
  onSSOConfigured?: () => void
}

export function EnterpriseSSOConfig({
  workspaceId,
  ssoEnabled = false,
  ssoProvider,
  onSSOConfigured
}: EnterpriseSSOProps) {
  const [configuring, setConfiguring] = useState(false)

  const handleConfigureSSO = () => {
    setConfiguring(true)
    // In a real app, this would open a configuration dialog or redirect to admin panel
    setTimeout(() => {
      setConfiguring(false)
      onSSOConfigured?.()
    }, 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building className="h-5 w-5" />
          <span>Enterprise SSO</span>
        </CardTitle>
        <CardDescription>
          Configure single sign-on for your workspace using SAML or OpenID Connect
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ssoEnabled ? (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-success-50 border-success-200">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-success-600" />
              <div>
                <h4 className="font-medium text-success-900">SSO Active</h4>
                <p className="text-sm text-success-700">
                  {ssoProvider} SSO is configured and active for this workspace
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Building className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">No SSO configured</h3>
              <p className="text-sm text-muted-foreground">
                Set up enterprise SSO to streamline authentication for your team
              </p>
            </div>
            <Button
              onClick={handleConfigureSSO}
              loading={configuring}
              disabled={configuring}
            >
              Configure SSO
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Supported SSO Providers</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2 p-2 border rounded">
              <CheckCircle2 className="h-4 w-4 text-success-600" />
              <span className="text-sm">SAML 2.0</span>
            </div>
            <div className="flex items-center space-x-2 p-2 border rounded">
              <CheckCircle2 className="h-4 w-4 text-success-600" />
              <span className="text-sm">OpenID Connect</span>
            </div>
            <div className="flex items-center space-x-2 p-2 border rounded">
              <CheckCircle2 className="h-4 w-4 text-success-600" />
              <span className="text-sm">Azure AD</span>
            </div>
            <div className="flex items-center space-x-2 p-2 border rounded">
              <CheckCircle2 className="h-4 w-4 text-success-600" />
              <span className="text-sm">Okta</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for handling OAuth flows
export function useOAuthFlow() {
  const router = useRouter()

  const initiateOAuth = (providerId: string, options?: {
    redirect?: string
    action?: 'login' | 'register' | 'link'
    workspaceInvite?: string
  }) => {
    const params = new URLSearchParams()

    if (options?.redirect) {
      params.append('redirect', options.redirect)
    }
    if (options?.action) {
      params.append('action', options.action)
    }
    if (options?.workspaceInvite) {
      params.append('invite', options.workspaceInvite)
    }

    const queryString = params.toString()
    const url = `/api/auth/oauth/${providerId}${queryString ? `?${queryString}` : ''}`

    window.location.href = url
  }

  return { initiateOAuth }
}