"use client"
import { useCallback, useMemo, useRef, useState } from 'react'
import { createAssistantProvider } from '@/lib/assistant/provider'
import type { ChatMessage } from '@/lib/assistant/types'

interface ChatPanelProps {
  documentId?: string
  selectionText?: string
}

export function ChatPanel({ documentId, selectionText }: ChatPanelProps) {
  const provider = useMemo(() => createAssistantProvider(), [])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const send = useCallback(async () => {
    const res = await provider.chat({ input, context: { documentId, selectionText } })
    setMessages((prev) => [...prev, ...res.messages])
    setInput('')
  }, [input, provider, documentId, selectionText])

  return (
    <div className="flex h-full w-full flex-col rounded-lg border bg-background">
      <div className="flex-1 overflow-auto p-3 space-y-3" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ask a question about your document or workspace…</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[85%] rounded px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) void send()
        }}
        className="flex gap-2 border-t p-2"
      >
        <label className="sr-only" htmlFor="assistant-input">
          Chat input
        </label>
        <input
          id="assistant-input"
          className="flex-1 rounded border px-3 py-2 text-sm outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
        />
        <button
          type="submit"
          className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          disabled={!input.trim()}
          aria-disabled={!input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatPanel
