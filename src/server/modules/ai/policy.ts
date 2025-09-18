import { rateLimiter } from '../../utils/rate-limit'
import { requireAccess, type GuardContext } from '../organization/api-guard'
import { OrgResourceType } from '../organization/models'
import type { NextRequest } from 'next/server'

export type AIPermission = 'ai:invoke' | 'ai:config' | 'ai:admin'

export interface AIGuardOptions {
  permission?: AIPermission
  rpm?: number
}

export async function requireAIAccess(
  req: NextRequest,
  opts: AIGuardOptions = {}
): Promise<GuardContext | Response> {
  const ctx = await requireAccess(req, opts.permission ?? 'ai:invoke', OrgResourceType.WORKSPACE)
  // NOTE: OrgResourceType not strictly relevant; pass dummy value (1) since api-guard only forwards to ACL service.
  if ((ctx as any)?.json) return ctx as any
  const userId = (ctx as any).userId as string
  const rpm = opts.rpm ?? Number(process.env.AI_RPM ?? 30)
  const key = `ai:${userId}`
  const rl = await rateLimiter.allow(key, rpm, 60_000)
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...(rl.headers ?? {}) },
    })
  }
  return ctx as GuardContext
}
