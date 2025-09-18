'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
          <Button asChild>
            <Link href="/editor">
              <Plus className="mr-2 h-4 w-4" />
              Open editor
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quickStarts.map((item) => (
            <Card key={item.title} className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{item.description}</p>
                <Badge variant="outline">{item.badge}</Badge>
                <Button variant="ghost" className="px-0" asChild>
                  <Link href={item.href}>Choose</Link>
                </Button>
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
