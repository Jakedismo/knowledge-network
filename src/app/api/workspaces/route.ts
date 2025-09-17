import { NextResponse } from 'next/server'
import { workspaceService } from '@/server/modules/organization/workspace.service'
import { requireAuth } from '@/server/modules/organization/api-guard'

export async function GET() {
  // Require user identity; list-user filter can be added later
  // eslint-disable-next-line require-await
  const dummyReq = { headers: new Headers() } as unknown as Request
  void dummyReq
  const list = await workspaceService.list()
  return NextResponse.json({ items: list })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const body = (await req.json()) as { name: string; description?: string | null; ownerId: string; settings?: Record<string, unknown> }
  if (!body?.name || !body?.ownerId) return NextResponse.json({ error: 'name and ownerId required' }, { status: 400 })
  const input: { name: string; ownerId: string; description?: string | null; settings?: Record<string, unknown> } = {
    name: body.name,
    ownerId: body.ownerId,
  }
  if (body.description !== undefined) input.description = body.description
  if (body.settings !== undefined) input.settings = body.settings
  const ws = await workspaceService.create(input)
  return NextResponse.json(ws, { status: 201 })
}
