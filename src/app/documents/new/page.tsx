'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Plus,
  Wand2,
  LayoutTemplate,
  Sparkles,
  BookOpen,
} from 'lucide-react'

const quickStarts = [
  {
    title: 'Blank document',
    description: 'Start from scratch with the AI assisted editor.',
    href: '/editor',
    badge: 'Cmd+E',
  },
  {
    title: 'Launch readiness plan',
    description: 'Template with guardrails and required sections.',
    href: '/templates',
    badge: 'Template',
  },
  {
    title: 'Incident decision log',
    description: 'Structured log for command bridges and retrospectives.',
    href: '/templates',
    badge: 'Template',
  },
]

export default function NewDocumentPage() {
  const [assistantDraft, setAssistantDraft] = useState<null | {
    title: string
    summary?: string
    transcript: string
    actionItems: Array<{ id: string; text: string; owner?: string; due?: string }>
  }>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('assistant:auto-draft')
      if (stored) {
        setAssistantDraft(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Failed to read assistant draft', error)
    }
  }, [])

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Document</h1>
            <p className="text-muted-foreground mt-2">
              Kick off new knowledge artifacts with AI assisted authoring or curated templates.
            </p>
          </div>
          <Link
            href="/editor"
            className={cn(buttonVariants(), 'gap-2')}
          >
            <Plus className="h-4 w-4" />
            Open editor
          </Link>
        </div>

        {assistantDraft ? (
          <Card className="border border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Assistant draft ready</span>
                <Badge variant="secondary">Capture</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {assistantDraft.summary
                  ? assistantDraft.summary
                  : 'A meeting transcript is staged. Open the editor to paste the transcript or action items.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/editor"
                  className={cn(buttonVariants(), 'gap-2')}
                  onClick={() => {
                    try {
                      localStorage.setItem('assistant:auto-draft', JSON.stringify(assistantDraft))
                    } catch (error) {
                      console.warn('Unable to persist draft for editor', error)
                    }
                  }}
                >
                  Open editor with draft
                </Link>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: 'outline' }), 'text-sm')}
                  onClick={() => {
                    localStorage.removeItem('assistant:auto-draft')
                    setAssistantDraft(null)
                  }}
                >
                  Dismiss draft
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {quickStarts.map((item) => (
            <Card key={item.title} className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{item.description}</p>
                <Badge variant="outline">{item.badge}</Badge>
                <Link
                  href={item.href}
                  className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
                >
                  Choose
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wand2 className="h-5 w-5 text-primary" />
              Accelerate with AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Let the assistant pre-fill sections, summarize related documents, and recommend reviewers based on taxonomy.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Generate outline
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Pull related knowledge
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <LayoutTemplate className="h-3 w-3" /> Apply template
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
