import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { templateService } from '@/server/modules/templates/template.service'
import { getBuiltinTemplateById } from '@/lib/templates/library'
import { renderTemplate as renderLibTemplate } from '@/lib/templates/engine'
import { renderTemplate as renderPlain } from '@/server/modules/templates/templating'

const renderSchema = z.object({
  templateId: z.string(),
  context: z.record(z.any()).default({}),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { templateId, context } = renderSchema.parse(body)
  // Try DB-backed template first
  const tpl = await templateService.get(templateId)
  if (tpl) {
    // DB templates store raw Markdown content with simple placeholders
    const content = renderPlain(tpl.content, (context as Record<string, any>) ?? {})
    return NextResponse.json({ content })
  }

  // Fallback to builtin library templates by id
  const def = getBuiltinTemplateById(templateId)
  if (def) {
    const result = renderLibTemplate(def, (context as Record<string, any>) ?? {})
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Template not found' }, { status: 404 })
}
