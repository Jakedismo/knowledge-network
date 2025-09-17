"use client"

import React, { useState } from 'react'
import { ApolloProvider, InMemoryCache, ApolloClient } from '@apollo/client'
import { logger } from '@/lib/logger'

import {
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  AuthLayout,
  PermissionGuard,
  RoleGuard,
  SSOProviderList,
  AuthProvider
} from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Mock Apollo client
const mockClient = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'ignore',
    },
  },
})

export default function AuthDemoPage() {
  const [currentAuthView, setCurrentAuthView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login')

  return (
    <ApolloProvider client={mockClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Authentication Components Demo</h1>
            <p className="text-muted-foreground text-lg">
              Essential authentication components for the Knowledge Network
            </p>
          </div>

          <Tabs defaultValue="auth-forms" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="auth-forms">Auth Forms</TabsTrigger>
              <TabsTrigger value="guards">Permission Guards</TabsTrigger>
              <TabsTrigger value="sso">SSO Integration</TabsTrigger>
            </TabsList>

            {/* Authentication Forms */}
            <TabsContent value="auth-forms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication Forms</CardTitle>
                  <CardDescription>
                    Complete authentication flow with form switching
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center space-x-2 mb-6">
                    <Button
                      variant={currentAuthView === 'login' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentAuthView('login')}
                    >
                      Login
                    </Button>
                    <Button
                      variant={currentAuthView === 'register' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentAuthView('register')}
                    >
                      Register
                    </Button>
                    <Button
                      variant={currentAuthView === 'forgot' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentAuthView('forgot')}
                    >
                      Forgot Password
                    </Button>
                    <Button
                      variant={currentAuthView === 'reset' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentAuthView('reset')}
                    >
                      Reset Password
                    </Button>
                  </div>

                  <div className="max-w-md mx-auto">
                    <AuthLayout>
                      {currentAuthView === 'login' && (
                        <LoginForm onToggleForm={() => setCurrentAuthView('register')} />
                      )}
                      {currentAuthView === 'register' && (
                        <RegisterForm onToggleForm={() => setCurrentAuthView('login')} />
                      )}
                      {currentAuthView === 'forgot' && (
                        <ForgotPasswordForm onBackToLogin={() => setCurrentAuthView('login')} />
                      )}
                      {currentAuthView === 'reset' && (
                        <ResetPasswordForm token="demo-token" />
                      )}
                    </AuthLayout>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permission Guards */}
            <TabsContent value="guards" className="space-y-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Permission Guards</CardTitle>
                    <CardDescription>
                      Role-based and permission-based access control components
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Permission Guard Examples</h4>
                      <PermissionGuard permission="document:create">
                        <Button>Create Document (Visible with permission)</Button>
                      </PermissionGuard>

                      <PermissionGuard permission="admin:manage" showFallback={true}>
                        <Button variant="destructive">Delete Everything (Admin only)</Button>
                      </PermissionGuard>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Role Guard Examples</h4>
                      <RoleGuard role="EDITOR">
                        <Button>Edit Content (Editor role)</Button>
                      </RoleGuard>

                      <RoleGuard role={["ADMIN", "EDITOR"]} showFallback={true}>
                        <Button variant="outline">Advanced Features (Admin/Editor)</Button>
                      </RoleGuard>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SSO Integration */}
            <TabsContent value="sso" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>SSO Integration</CardTitle>
                  <CardDescription>
                    Single Sign-On provider integration components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SSOProviderList
                    onProviderSelect={(provider) => {
                      logger.info?.('Selected provider:', provider)
                    }}
                    title="Sign in with"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Design System Integration */}
          <Card>
            <CardHeader>
              <CardTitle>Design System Integration</CardTitle>
              <CardDescription>
                How authentication components use the Knowledge Network design system
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
                    Error States
                  </div>
                  <p className="text-xs text-muted-foreground">Error messages, validation</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 rounded bg-success-500 flex items-center justify-center text-white text-sm font-medium">
                    Success States
                  </div>
                  <p className="text-xs text-muted-foreground">Success confirmations</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 rounded bg-warning-500 flex items-center justify-center text-white text-sm font-medium">
                    Security Warnings
                  </div>
                  <p className="text-xs text-muted-foreground">Security alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </AuthProvider>
    </ApolloProvider>
  )
}
