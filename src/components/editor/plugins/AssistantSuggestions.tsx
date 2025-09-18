"use client"
import { useEffect, useMemo, useState } from 'react'
import type { EditorContext } from '@/lib/editor/types'
import { createAssistantProvider } from '@/lib/assistant/provider'
import type { SuggestionItem } from '@/lib/assistant/types'

export function AssistantSuggestions({ ctx, getSelectionText }: { ctx?: EditorContext; getSelectionText?: () => string }) {
  const provider = useMemo(() => createAssistantProvider({ mode: 'mock' }), [])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    let mounted = true
    const debounce = setTimeout(async () => {
      const t = (getSelectionText ?? ctx?.getSelectionText)?.() ?? ''
      setText(t)
      if (!t || t.trim().length < 8) {
        if (mounted) setSuggestions([])
        return
      }
      const res = await provider.suggest({ text: t })
      if (mounted) setSuggestions(res.suggestions)
    }, 300)
    return () => {
      mounted = false
      clearTimeout(debounce)
    }
  }, [ctx, provider, getSelectionText])

  if (suggestions.length === 0) return null

  return (
    <aside className="rounded border p-2 text-sm">
      <div className="mb-1 text-xs font-medium text-muted-foreground">Suggestions</div>
      <ul className="space-y-1">
        {suggestions.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span>
              <span className="mr-1 rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wide">{s.kind}</span>
              {s.text}
            </span>
            <span className="text-[10px] text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-[10px] text-muted-foreground">Based on selection ({text.length} chars)</div>
    </aside>
  )
}

export default AssistantSuggestions
