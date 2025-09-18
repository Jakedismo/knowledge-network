"use client"

import { useCallback, useMemo, useState } from 'react'
import { ShieldCheck, ClipboardCheck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import type { FactCheckResponse } from '@/lib/assistant/types'

const STATUS_META: Record<string, { label: string; tone: 'supported' | 'contradicted' | 'uncertain'; emoji: string }> = {
  supported: { label: 'Supported', tone: 'supported', emoji: '✅' },
  contradicted: { label: 'Contradicted', tone: 'contradicted', emoji: '⚠️' },
  uncertain: { label: 'Needs review', tone: 'uncertain', emoji: '❓' },
}

export function AssistantVerifyTool() {
  const { provider, context } = useAssistantRuntime()
  const [claim, setClaim] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FactCheckResponse | null>(null)

  const selectionAvailable = Boolean(context.selectionText?.trim())

  const statusMeta = useMemo(() => {
    if (!result) return null
    return STATUS_META[result.finding.status]
  }, [result])

  const runCheck = useCallback(async () => {
    if (!claim.trim()) return
    setBusy(true)
    setError(null)
    try {
      const payload: Parameters<typeof provider.factCheck>[0] = { claim, context }
      if (context.documentId) payload.documentId = context.documentId
      const response = await provider.factCheck(payload)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fact-check this claim right now.')
    } finally {
      setBusy(false)
    }
  }, [claim, provider, context])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Verification Copilot
        </div>
        <p className="mt-1">
          Paste a statement to validate it against knowledge-base sources. The assistant will reference relevant
          evidence and highlight gaps.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="assistant-verify-claim">
            Statement to verify
          </label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3" /> Context: {context.pageTitle ?? 'Unknown page'}
          </div>
        </div>
        <Textarea
          id="assistant-verify-claim"
          rows={4}
          value={claim}
          placeholder="e.g. Our Q4 release increased customer satisfaction by 18%."
          onChange={(event) => setClaim(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={runCheck} disabled={!claim.trim() || busy}>
            {busy ? 'Checking…' : 'Verify claim'}
          </Button>
          {selectionAvailable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setClaim(context.selectionText ?? '')}
            >
              Use highlighted text
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Fact-checks use OpenAI Agents with structured evidence retrieval.
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex-1 overflow-auto rounded border bg-background">
        {statusMeta && result ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  statusMeta.tone === 'supported'
                    ? 'secondary'
                    : statusMeta.tone === 'contradicted'
                      ? 'destructive'
                      : 'outline'
                }
              >
                {statusMeta.emoji} {statusMeta.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{result.claim}</span>
            </div>
            {result.finding.evidence && result.finding.evidence.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidence
                </h4>
                <ul className="space-y-2 text-sm">
                  {result.finding.evidence.map((item) => (
                    <li key={item.id} className="rounded border bg-muted/20 p-3">
                      <div className="font-medium">{item.title}</div>
                      <p className="text-sm text-muted-foreground">{item.snippet}</p>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ClipboardCheck className="h-3 w-3" />
                          View source
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">
                No supporting passages were returned. Consider refining the claim or supplying more context.
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5" />
            <p>Paste a statement to verify and the assistant will source evidence automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AssistantVerifyTool
