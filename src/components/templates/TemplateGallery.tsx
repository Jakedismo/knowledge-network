"use client"
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TemplateItem = { id: string; name: string; description?: string; version: string; visibility: string }

export interface TemplateGalleryProps {
  className?: string
  onSelect?: (id: string) => void
}

export function TemplateGallery({ className, onSelect }: TemplateGalleryProps) {
  const [q, setQ] = React.useState('')
  const [items, setItems] = React.useState<TemplateItem[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/templates-simple?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error('Failed to load templates')
        const data = await res.json()
        if (!cancelled) setItems(data.templates?.map((t: any) => ({
          id: t.id,
          name: t.title,
          description: t.description,
          version: '1.0',
          visibility: t.isPublic ? 'public' : 'private'
        })) ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [q])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Input placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No templates found.</div>
        ) : (
          items.map((t: TemplateItem) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription>{t.description ?? ''}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">v{t.version} · {t.visibility}</div>
                {onSelect ? (
                  <Button size="sm" onClick={() => onSelect(t.id)}>Use</Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
