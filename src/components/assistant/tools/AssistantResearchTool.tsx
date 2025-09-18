"use client"

import { useCallback, useMemo, useState } from 'react'
import { Sparkles, Search, BookOpen, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import type { ResearchRequest, ResearchItem } from '@/lib/assistant/types'

const QUICK_PROMPTS: Array<{ id: string; label: string; query: string; scope: ResearchRequest['scope'] }> = [
  {
    id: 'summarize-page',
    label: 'Summarize this page',
    query: 'Summarize the key insights from the current page and suggest next actions.',
    scope: 'internal',
  },
  {
    id: 'find-related',
    label: 'Find related knowledge',
    query: 'Find three related knowledge-base documents the team should review next.',
    scope: 'internal',
  },
  {
    id: 'industry-scan',
    label: 'Industry scan',
    query: 'What recent industry developments should we know about for this topic?',
    scope: 'external',
  },
]

export function AssistantResearchTool() {
  const { provider, context } = useAssistantRuntime()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<ResearchRequest['scope']>('both')
  const [results, setResults] = useState<ResearchItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasResults = results.length > 0
  const activeScopeLabel = useMemo(() => {
    switch (scope) {
      case 'internal':
        return 'Knowledge Base'
      case 'external':
        return 'Trusted Web'
      default:
        return 'Both sources'
    }
  }, [scope])

  const runResearch = useCallback(
    async (details: { query: string; scope: ResearchRequest['scope'] }) => {
      if (!details.query.trim()) return
      setBusy(true)
      setError(null)
      try {
        const response = await provider.research({
          query: details.query,
          scope: details.scope,
          maxItems: 6,
          context,
        })
        setResults(response.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to complete research right now.')
      } finally {
        setBusy(false)
      }
    },
    [provider, context]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Search className="h-3.5 w-3.5" /> Research Assistant
        </div>
        <p className="mt-1">
          Launch targeted investigations across the knowledge base or the web, and pull actionable summaries
          directly into your workflow.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="assistant-research-query">
          Ask a research question
        </label>
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            id="assistant-research-query"
            value={query}
            placeholder="e.g. What risks should we watch before launch?"
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <select
              aria-label="Research scope"
              className="rounded border bg-background px-2 py-2 text-sm"
              value={scope}
              onChange={(event) => setScope(event.target.value as ResearchRequest['scope'])}
            >
              <option value="both">Internal + Web</option>
              <option value="internal">Knowledge Base</option>
              <option value="external">Trusted Web</option>
            </select>
            <Button
              type="button"
              onClick={() => runResearch({ query, scope })}
              disabled={!query.trim() || busy}
            >
              {busy ? 'Searching…' : 'Run'}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Quick prompts</span>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery(item.query)
                setScope(item.scope)
                runResearch({ query: item.query, scope: item.scope })
              }}
              disabled={busy}
              className="flex items-center gap-1 text-xs"
            >
              <Sparkles className="h-3 w-3" />
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex-1 overflow-auto rounded border bg-background">
        {busy && !hasResults ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Gathering insights from {activeScopeLabel}…
          </div>
        ) : hasResults ? (
          <ul className="divide-y">
            {results.map((item) => (
              <li key={item.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
                    {item.source === 'kb' ? (
                      <BookOpen className="h-3 w-3" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    {item.source === 'kb' ? 'Internal' : 'Web'}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.snippet}</p>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open source
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Search className="h-5 w-5" />
            <p>Run a prompt or pick a quick action to gather decision-ready research.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AssistantResearchTool
