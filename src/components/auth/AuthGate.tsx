"use client"
import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Lightweight client-side gate to require auth when RBAC is enabled.
// Uses presence of `auth-token` in localStorage as the signal.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    const requireRbac = (process.env.NEXT_PUBLIC_AI_REQUIRE_RBAC ?? '0') === '1'
    if (!requireRbac) return
    if (pathname?.startsWith('/auth')) return
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem('auth-token')
    if (!token) {
      const redirect = encodeURIComponent(pathname || '/')
      router.replace(`/auth/login?redirect=${redirect}`)
    }
  }, [pathname, router])

  return <>{children}</>
}

