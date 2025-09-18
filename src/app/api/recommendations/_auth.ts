import { verifyJWT } from '@/lib/auth/jwt'
import type { NextRequest } from 'next/server'

export async function authenticateRequest(request: NextRequest, fallbackUser?: string): Promise<string | null> {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    try {
      const decoded = await verifyJWT(auth.slice('Bearer '.length))
      const subject = decoded?.sub as string | undefined
      return subject ?? null
    } catch (error) {
      console.warn('JWT verification failed', error)
      return null
    }
  }
  return fallbackUser ?? null
}

