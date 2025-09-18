"use client"
import { useState } from 'react'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'

interface FactCheckBadgeProps {
  claim: string
  documentId?: string
}

export function FactCheckBadge({ claim, documentId }: FactCheckBadgeProps) {
  const { provider, context: baseContext } = useAssistantRuntime()
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<string>('')

  async function run() {
    setStatus('running')
    const payload: Parameters<typeof provider.factCheck>[0] = { claim, context: baseContext }
    if (documentId) payload.documentId = documentId
    const res = await provider.factCheck(payload)
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
