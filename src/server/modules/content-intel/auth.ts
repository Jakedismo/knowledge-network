import { NextResponse } from 'next/server'

export async function ensureAuthorized(req: Request): Promise<Response | null> {
  // If org guard is enabled, use it (dynamic import to avoid prisma coupling in tests)
  if (process.env.USE_ORG_GUARD === '1') {
    try {
      const mod = await import('@/server/modules/organization/api-guard')
      const models = await import('@/server/modules/organization/models')
      const res = await mod.requireAccess(req, models.OrgPermission.DOCUMENT_CREATE, models.OrgResourceType.WORKSPACE)
      if (res instanceof NextResponse) return res
      return null
    } catch (e: any) {
      // Fallback below if prisma/client not available in this environment
    }
  }
  // Basic header check fallback for local/test environments
  const userId = req.headers.get('x-user-id')
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  return null
}

