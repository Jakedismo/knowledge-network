/**
 * Authentication Components Stories
 *
 * Showcases all authentication-related components in the design system
 */

import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ApolloProvider } from '@apollo/client'
import { createMockClient } from '@apollo/client/testing'

import {
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  AuthLayout,
  UserProfile,
  PermissionGuard,
  RoleGuard,
  SSOProviderList,
  TwoFactorSetup,
  SecurityDashboard,
  SecurityNotifications,
  ActiveSessions
} from '@/components/auth'
import { AuthProvider } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Mock Apollo client for Storybook
const mockClient = createMockClient([])

// Mock auth provider wrapper
const MockAuthProvider = ({ children, mockUser = null }: { children: React.ReactNode, mockUser?: any }) => (
  <ApolloProvider client={mockClient}>
    <div style={{ minHeight: '100vh' }}>
      {children}
    </div>
  </ApolloProvider>
)

const meta: Meta = {
  title: 'Authentication/Components',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Complete authentication component library including forms, guards, SSO, and security features.',
      },
    },
  },
  decorators: [
    (Story) => (
      <MockAuthProvider>
        <Story />
      </MockAuthProvider>
    ),
  ],
}

export default meta
type Story = StoryObj

// Authentication Forms
export const LoginFormStory: Story = {
  name: 'Login Form',
  render: () => (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  ),
}

export const RegisterFormStory: Story = {
  name: 'Register Form',
  render: () => (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  ),
}

export const ForgotPasswordStory: Story = {
  name: 'Forgot Password Form',
  render: () => (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  ),
}

export const ResetPasswordStory: Story = {
  name: 'Reset Password Form',
  render: () => (
    <AuthLayout>
      <ResetPasswordForm token="sample-token" />
    </AuthLayout>
  ),
}

// Permission Guards
export const PermissionGuardsStory: Story = {
  name: 'Permission Guards',
  render: () => (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Permission Guards</h1>
        <p className="text-muted-foreground">
          Role-based and permission-based access control components
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Permission Guard Example</CardTitle>
            <CardDescription>
              Shows content only if user has the required permission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PermissionGuard permission="document:create">
              <Button>Create Document (Visible with permission)</Button>
            </PermissionGuard>

            <PermissionGuard permission="admin:manage" showFallback={true}>
              <Button variant="destructive">Delete Everything (Admin only)</Button>
            </PermissionGuard>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Guard Example</CardTitle>
            <CardDescription>
              Shows content only if user has the required role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RoleGuard role="EDITOR">
              <Button>Edit Content (Editor role)</Button>
            </RoleGuard>

            <RoleGuard role={["ADMIN", "EDITOR"]} showFallback={true}>
              <Button variant="outline">Advanced Features (Admin/Editor)</Button>
            </RoleGuard>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
}

// SSO Integration
export const SSOIntegrationStory: Story = {
  name: 'SSO Integration',
  render: () => (
    <div className="p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">SSO Integration</h1>
        <p className="text-muted-foreground">
          Single Sign-On provider integration components
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OAuth Providers</CardTitle>
          <CardDescription>
            Available OAuth and SSO providers for authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SSOProviderList
            onProviderSelect={(provider) => console.log('Selected provider:', provider)}
            title="Sign in with"
          />
        </CardContent>
      </Card>
    </div>
  ),
}

// Security Components
export const TwoFactorSetupStory: Story = {
  name: '2FA Setup',
  render: () => (
    <div className="p-8 max-w-2xl mx-auto">
      <TwoFactorSetup />
    </div>
  ),
}

export const SecurityDashboardStory: Story = {
  name: 'Security Dashboard',
  render: () => (
    <div className="p-8 max-w-6xl mx-auto">
      <SecurityDashboard />
    </div>
  ),
}

export const SecurityNotificationsStory: Story = {
  name: 'Security Notifications',
  render: () => (
    <div className="p-8 max-w-2xl mx-auto">
      <SecurityNotifications />
    </div>
  ),
}

export const ActiveSessionsStory: Story = {
  name: 'Active Sessions',
  render: () => (
    <div className="p-8 max-w-4xl mx-auto">
      <ActiveSessions />
    </div>
  ),
}

// User Profile
export const UserProfileStory: Story = {
  name: 'User Profile',
  render: () => (
    <div className="p-8 max-w-4xl mx-auto">
      <UserProfile />
    </div>
  ),
}

// Complete Authentication Flow
const AuthFlowComponent = () => {
  const [currentView, setCurrentView] = React.useState<'login' | 'register' | 'forgot'>('login')

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div className="flex justify-center space-x-2 mb-6">
          <Button
            variant={currentView === 'login' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('login')}
          >
            Login
          </Button>
          <Button
            variant={currentView === 'register' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('register')}
          >
            Register
          </Button>
          <Button
            variant={currentView === 'forgot' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('forgot')}
          >
            Forgot Password
          </Button>
        </div>

        {currentView === 'login' && (
          <LoginForm onToggleForm={() => setCurrentView('register')} />
        )}
        {currentView === 'register' && (
          <RegisterForm onToggleForm={() => setCurrentView('login')} />
        )}
        {currentView === 'forgot' && (
          <ForgotPasswordForm onBackToLogin={() => setCurrentView('login')} />
        )}
      </div>
    </AuthLayout>
  )
}

export const AuthenticationFlowStory: Story = {
  name: 'Complete Auth Flow',
  render: () => <AuthFlowComponent />
}

// Design System Integration
export const DesignSystemIntegration: Story = {
  name: 'Design System Integration',
  render: () => (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold mb-2">Authentication Design System</h1>
        <p className="text-muted-foreground text-lg">
          Comprehensive authentication components built with the Knowledge Network design system
        </p>
      </div>

      <div className="grid gap-8">
        {/* Color Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Color System Integration</CardTitle>
            <CardDescription>
              How authentication components use the design system colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-12 rounded bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  Primary Actions
                </div>
                <p className="text-xs text-muted-foreground">Login, Register buttons</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 rounded bg-destructive flex items-center justify-center text-destructive-foreground text-sm font-medium">
                  Errors
                </div>
                <p className="text-xs text-muted-foreground">Error messages, validation</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 rounded bg-success-500 flex items-center justify-center text-white text-sm font-medium">
                  Success
                </div>
                <p className="text-xs text-muted-foreground">Success states, confirmations</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 rounded bg-warning-500 flex items-center justify-center text-white text-sm font-medium">
                  Warnings
                </div>
                <p className="text-xs text-muted-foreground">Security warnings, alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography Hierarchy</CardTitle>
            <CardDescription>
              Consistent typography usage across authentication components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">Sign in to your account</div>
            <div className="text-muted-foreground">Enter your email and password to access your workspace</div>
            <div className="text-sm font-medium">Email address</div>
            <div className="text-xs text-muted-foreground">We'll never share your email with anyone else.</div>
          </CardContent>
        </Card>

        {/* Component Consistency */}
        <Card>
          <CardHeader>
            <CardTitle>Component Consistency</CardTitle>
            <CardDescription>
              All authentication components follow the same design patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Form Components</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Consistent input styling</li>
                    <li>• Standard validation</li>
                    <li>• Loading states</li>
                    <li>• Error handling</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Security Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 2FA integration</li>
                    <li>• SSO providers</li>
                    <li>• Security notifications</li>
                    <li>• Session management</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Access Control</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Permission guards</li>
                    <li>• Role-based access</li>
                    <li>• Workspace controls</li>
                    <li>• Feature flags</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
}