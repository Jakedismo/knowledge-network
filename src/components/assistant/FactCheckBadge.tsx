"use client"
import { useMemo, useState } from 'react'
import { createAssistantProvider } from '@/lib/assistant/provider'

interface FactCheckBadgeProps {
  claim: string
  documentId?: string
}

export function FactCheckBadge({ claim, documentId }: FactCheckBadgeProps) {
  const provider = useMemo(() => createAssistantProvider(), [])
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<string>('')

  async function run() {
    setStatus('running')
    const res = await provider.factCheck({ claim, documentId })
    const icon = res.finding.status === 'supported' ? '✅' : res.finding.status === 'contradicted' ? '⚠️' : '❓'
    setResult(`${icon} ${res.finding.status}`)
    setStatus('done')
  }

  return (
    <button
      onClick={() => void run()}
      className="inline-flex items-center gap-2 rounded border px-2 py-1 text-xs"
      aria-live="polite"
    >
      <span>Fact Check</span>
      {status !== 'idle' && <span className="text-muted-foreground">{status === 'running' ? '…' : result}</span>}
    </button>
  )
}

export default FactCheckBadge
