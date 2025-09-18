"use client"
import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/auth/auth-layout'
import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/dashboard'
  const requireRbac = (process.env.NEXT_PUBLIC_AI_REQUIRE_RBAC ?? '0') === '1'

  React.useEffect(() => {
    if (!requireRbac) {
      // Dev/guest mode: drop a simple token so APIs that expect Authorization work
      if (typeof window !== 'undefined') {
        const token = window.localStorage.getItem('auth-token') || `dev-${Math.random().toString(36).slice(2)}`
        window.localStorage.setItem('auth-token', token)
      }
      router.replace(redirect)
    }
  }, [requireRbac, redirect, router])

  if (!requireRbac) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>Continuing to app…</CardTitle>
            <CardDescription>Guest mode enabled (AI_REQUIRE_RBAC=0)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Redirecting… If nothing happens, <Button variant="link" onClick={() => router.replace(redirect)}>click here</Button>.</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md">
        <AuthLayout>
          <LoginForm />
        </AuthLayout>
      </div>
    </main>
  )
}

