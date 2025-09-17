import { NextResponse } from 'next/server'
import { templateAnalytics } from '@/server/modules/templates/analytics.service'
import '@/server/startup'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const templateId = url.searchParams.get('templateId')
  if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 })
  const summary = await templateAnalytics.summarize(templateId)
  return NextResponse.json(summary)
}

