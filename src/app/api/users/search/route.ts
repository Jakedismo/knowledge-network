import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/modules/organization/api-guard'

// Minimal in-memory directory for mentions suggestions; replace with real user search
const USERS: { id: string; displayName: string; avatarUrl?: string }[] = [
  { id: 'u_alex', displayName: 'Alex Johnson' },
  { id: 'u_bao', displayName: 'Bao Nguyen' },
  { id: 'u_cara', displayName: 'Cara Patel' },
  { id: 'u_dan', displayName: 'Danielle Brooks' },
  { id: 'u_eli', displayName: 'Eli Martínez' },
]

const querySchema = z.object({ q: z.string().optional().default('') })

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { searchParams } = new URL(req.url)
    const { q } = querySchema.parse({ q: searchParams.get('q') || '' })
    const needle = q.trim().toLowerCase()
    const data = USERS.filter((u) => u.displayName.toLowerCase().includes(needle)).slice(0, 8)
    return NextResponse.json({ data })
  } catch (e: any) {
    const status = e?.status ?? 400
    return NextResponse.json({ error: e?.message || 'Bad Request' }, { status })
  }
}

