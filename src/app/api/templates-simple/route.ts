import { NextRequest, NextResponse } from 'next/server'
import { builtinTemplates } from '@/lib/templates/library'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()

  const items = builtinTemplates
    .map((t) => ({
      id: t.id,
      title: t.name,
      description: t.description,
      version: t.version,
      visibility: t.visibility,
      category: t.category,
      tags: t.keywords ?? [],
    }))
    .filter((t) => {
      if (!q) return true
      const hay = [t.title, t.description, t.category, ...(t.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })

  return NextResponse.json({ templates: items })
}

