"use client"
import { useState } from 'react'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'

export function ContextHelp({ route, selectionText }: { route?: string; selectionText?: string }) {
  const { provider, context: baseContext } = useAssistantRuntime()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ id: string; title: string; body: string }[]>([])

  async function load() {
    const payload: Parameters<typeof provider.contextHelp>[0] = {}
    if (route) payload.route = route
    if (selectionText) payload.selectionText = selectionText
    if (baseContext.tags) payload.tags = baseContext.tags
    const res = await provider.contextHelp(payload)
    setItems(res)
    setOpen((v) => !v)
  }

  return (
    <div className="relative inline-block">
      <button className="rounded border px-2 py-1 text-xs" onClick={() => void load()} aria-expanded={open}>
        Help
      </button>
      {open && (
        <div
          className="absolute z-10 mt-2 w-72 rounded border bg-background p-3 shadow"
          role="dialog"
          aria-label="Context Help"
        >
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id}>
                <div className="text-sm font-medium">{i.title}</div>
                <p className="text-xs text-muted-foreground">{i.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ContextHelp
