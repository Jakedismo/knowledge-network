"use client"
import { useEffect, useState } from 'react'
import type { EditorContext } from '@/lib/editor/types'
import type { SuggestionItem } from '@/lib/assistant/types'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'

export function AssistantSuggestions({ ctx, getSelectionText }: { ctx?: EditorContext; getSelectionText?: () => string }) {
  const { provider, context: baseContext, mergeContext } = useAssistantRuntime()
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    let mounted = true
    const debounce = setTimeout(async () => {
      const t = (getSelectionText ?? ctx?.getSelectionText)?.() ?? ''
      setText(t)
      if (!t || t.trim().length < 8) {
        if (mounted) setSuggestions([])
        if (baseContext.selectionText) mergeContext({ selectionText: undefined })
        return
      }
      if (t !== baseContext.selectionText) mergeContext({ selectionText: t })
      const res = await provider.suggest({ text: t, context: { ...baseContext, selectionText: t } })
      if (mounted) setSuggestions(res.suggestions)
    }, 300)
    return () => {
      mounted = false
      clearTimeout(debounce)
    }
  }, [ctx, provider, getSelectionText, baseContext, mergeContext])

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
