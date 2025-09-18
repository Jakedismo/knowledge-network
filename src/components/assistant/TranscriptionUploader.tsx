"use client"
import { useMemo, useState } from 'react'
import { createAssistantProvider } from '@/lib/assistant/provider'

export function TranscriptionUploader() {
  const provider = useMemo(() => createAssistantProvider(), [])
  const [summary, setSummary] = useState<string>('')
  const [items, setItems] = useState<{ id: string; text: string; owner?: string; due?: string }[]>([])
  const [busy, setBusy] = useState(false)

  async function onFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    setBusy(true)
    const res = await provider.transcribe({ fileName: file.name, bytes })
    setSummary(res.summary || '')
    setItems(res.actionItems)
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Upload meeting audio (mock)</label>
      <input
        type="file"
        accept="audio/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void onFile(file)
        }}
      />
      {busy && <p className="text-sm text-muted-foreground">Processing…</p>}
      {summary && (
        <div className="rounded border p-3">
          <h4 className="mb-1 font-medium">Summary</h4>
          <p className="text-sm">{summary}</p>
        </div>
      )}
      {items.length > 0 && (
        <div className="rounded border p-3">
          <h4 className="mb-2 font-medium">Action Items</h4>
          <ul className="list-disc pl-5 text-sm">
            {items.map((it) => (
              <li key={it.id}>
                {it.text}
                {it.owner ? ` — ${it.owner}` : ''}
                {it.due ? ` (due ${it.due})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default TranscriptionUploader
