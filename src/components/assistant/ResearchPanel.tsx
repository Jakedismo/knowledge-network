"use client"
import { useState } from 'react'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import type { ResearchRequest } from '@/lib/assistant/types'

export function ResearchPanel() {
  const { provider, context: baseContext } = useAssistantRuntime()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<ResearchRequest['scope']>('both')
  const [items, setItems] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      const res = await provider.research({ query, scope, maxItems: 4, context: baseContext })
      setItems(res.items)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="Research topic…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Research scope"
          className="rounded border px-2 py-2 text-sm"
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
        >
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="both">Both</option>
        </select>
        <button
          className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          disabled={!query.trim()}
          onClick={() => void run()}
        >
          Search
        </button>
      </div>
      {busy && <p className="text-xs text-muted-foreground">Gathering insights…</p>}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="rounded border p-3">
              <div className="text-sm font-medium">{it.title}</div>
              <div className="text-xs text-muted-foreground">Source: {it.source}</div>
              <p className="text-sm mt-1">{it.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ResearchPanel
