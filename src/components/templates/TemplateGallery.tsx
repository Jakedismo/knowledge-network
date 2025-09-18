"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type TemplateItem = {
  id: string
  name: string
  description?: string
  version: string
  visibility: string
  category?: string
  tags?: string[]
}

const FALLBACK_TEMPLATES: TemplateItem[] = [
  {
    id: 'incident-postmortem',
    name: 'Incident Postmortem',
    description: 'Structured root-cause analysis with mitigation tracker.',
    version: '1.3',
    visibility: 'public',
    category: 'operations',
    tags: ['incident', 'postmortem', 'operations'],
  },
  {
    id: 'launch-readiness',
    name: 'Launch Readiness Checklist',
    description: 'Gate-by-gate readiness assessment for product launches.',
    version: '2.1',
    visibility: 'public',
    category: 'go-to-market',
    tags: ['launch', 'checklist'],
  },
  {
    id: 'decision-log',
    name: 'Decision Log',
    description: 'Capture context, options, and outcomes for critical decisions.',
    version: '1.5',
    visibility: 'public',
    category: 'governance',
    tags: ['decision', 'governance'],
  },
  {
    id: 'customer-research',
    name: 'Customer Research Summary',
    description: 'Synthesize interviews, sentiment, and recommended actions.',
    version: '1.0',
    visibility: 'workspace',
    category: 'customer',
    tags: ['research', 'customer'],
  },
  {
    id: 'operational-runbook',
    name: 'Operational Runbook',
    description: 'Step-by-step runbook with escalation ladder and health checks.',
    version: '1.7',
    visibility: 'workspace',
    category: 'operations',
    tags: ['runbook', 'operations'],
  },
]

const filterTemplates = (templates: TemplateItem[], term: string) => {
  const normalized = term.trim().toLowerCase()
  if (!normalized) return templates

  return templates.filter(template => {
    const haystack = [
      template.name,
      template.description,
      template.category,
      ...(template.tags ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalized)
  })
}

export interface TemplateGalleryProps {
  className?: string
  onSelect?: (id: string) => void
}

export function TemplateGallery({ className, onSelect }: TemplateGalleryProps) {
  const [q, setQ] = React.useState('')
  const [items, setItems] = React.useState<TemplateItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const backendFailedRef = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false

    const resolve = (data: TemplateItem[]) => {
      if (!cancelled) {
        setItems(data)
      }
    }

    const resolveFallback = () => {
      resolve(filterTemplates(FALLBACK_TEMPLATES, q))
    }

    const run = async () => {
      if (backendFailedRef.current) {
        resolveFallback()
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/templates-simple?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error('Failed to load templates')
        const data = await res.json()
        resolve(
          (data.templates?.map((t: any) => ({
            id: t.id,
            name: t.title ?? t.name ?? 'Untitled template',
            description: t.description,
            version: t.version ?? '1.0',
            visibility: t.isPublic || t.visibility === 'public' ? 'public' : 'private',
            category: t.category,
            tags: Array.isArray(t.tags) ? t.tags : undefined,
          })) ?? []),
        )
      } catch (error) {
        console.warn('TemplateGallery: using fallback dataset', error)
        backendFailedRef.current = true
        resolveFallback()
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [q])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search templates…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No templates found.</div>
        ) : (
          items.map((template: TemplateItem) => (
            <Card key={template.id} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.description ? (
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="mt-auto space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    v{template.version} · {template.visibility}
                  </span>
                  {template.category ? <span>{template.category}</span> : null}
                </div>
                {template.tags && template.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {onSelect ? (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => onSelect(template.id)}>
                      Use template
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
