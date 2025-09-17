import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { templateService } from '@/server/modules/templates/template.service'

const renderSchema = z.object({
  templateId: z.string(),
  context: z.record(z.any()).default({}),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { templateId, context } = renderSchema.parse(body)
  const tpl = await templateService.get(templateId)
  if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  const result = templateService.render(tpl, context)
  return NextResponse.json(result)
}

