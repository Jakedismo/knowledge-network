"use client"
import { useMemo, useState } from 'react'
import { createAssistantProvider } from '@/lib/assistant/provider'

export function ContextHelp({ route, selectionText }: { route?: string; selectionText?: string }) {
  const provider = useMemo(() => createAssistantProvider({ mode: 'mock' }), [])
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ id: string; title: string; body: string }[]>([])

  async function load() {
    const res = await provider.contextHelp({ route, selectionText })
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

