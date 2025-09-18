'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sparkles, MessageSquare, Search, ShieldCheck, Mic, Command } from 'lucide-react'

export default function AssistantOverviewPage() {
  return (
    <AppLayout assistantContext={{ pageTitle: 'AI Assistant' }}>
      <div className="space-y-8">
        <header className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-8">
          <Badge variant="secondary" className="flex items-center gap-2 text-xs">
            <Sparkles className="h-3 w-3" /> Workspace Copilot
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">The Knowledge Agent is everywhere now</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Open the assistant from any page with the floating “Ask Knowledge” button or the <kbd className="inline-flex items-center gap-1 rounded border px-1 text-[11px]"><Command className="h-3 w-3" /> I</kbd> shortcut. Chat, research, verify, and capture meetings without leaving your current task.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="flex flex-row items-center gap-3">
                <feature.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.description}</CardContent>
            </Card>
          ))}
        </section>

        <Separator />

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                The assistant is powered by the OpenAI Agents SDK and automatically receives the route, selection, and workspace context for richer responses.
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Open the dock (<kbd className="inline-flex items-center gap-1 rounded border px-1 text-[11px]"><Command className="h-3 w-3" /> I</kbd>).</li>
                <li>Pick a tool tab — Ask, Research, Verify, or Capture.</li>
                <li>Send the response into your workflow (copy, auto-draft, or open related docs).</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Highlight text before opening the assistant to fact-check or expand that selection instantly.</p>
              <p>Enable auto-draft in Capture mode to stage meeting notes when you create a new document.</p>
              <p>Use Research quick prompts to stay ahead of launches, incidents, and customer feedback trends.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  )
}

const FEATURES = [
  {
    title: 'Ask (chat)',
    description: 'Natural conversations grounded in workspace knowledge and prior answers.',
    icon: MessageSquare,
  },
  {
    title: 'Research briefs',
    description: 'Curated digests from the knowledge base or trusted web sources with citations.',
    icon: Search,
  },
  {
    title: 'Verify claims',
    description: 'Evidence-backed fact checks for decisions, metrics, and customer statements.',
    icon: ShieldCheck,
  },
  {
    title: 'Capture meetings',
    description: 'Transcribe audio, extract action items, and auto-stage a draft document.',
    icon: Mic,
  },
] as const
