"use client"
import { useCallback, useRef, useState } from 'react'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import type { AssistantContext, ChatMessage } from '@/lib/assistant/types'

interface ChatPanelProps {
  documentId?: string
  selectionText?: string
}

export function ChatPanel({ documentId, selectionText }: ChatPanelProps) {
  const { provider, context: baseContext } = useAssistantRuntime()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const streaming = process.env.NEXT_PUBLIC_ASSISTANT_STREAM === 'true'

  const send = useCallback(async () => {
    if (streaming) {
      const controller = new AbortController()
      const now = new Date().toISOString()
      // Optimistically append user message and empty assistant bubble
      setMessages((prev) => [
        ...prev,
        { id: `u:${now}`, role: 'user', content: input, createdAt: now },
        { id: `a:${now}`, role: 'assistant', content: '', createdAt: now },
      ])
      const context = mergeContext(baseContext, { documentId, selectionText })
      const history = messages.map((m): { role: 'user' | 'assistant'; content: string } => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))
      const resp = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: 'chat',
          input: { question: input, context, history },
          stream: true,
        }),
        signal: controller.signal,
      })
      if (!resp.ok || !resp.body) {
        setInput('')
        return
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const lines = part.split('\n')
          const event = lines.find((l) => l.startsWith('event: '))?.slice(7)
          const dataLine = lines.find((l) => l.startsWith('data: '))?.slice(6)
          if (event === 'text' && dataLine) {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                last.content += JSON.parse(dataLine)
              }
              return next
            })
          }
        }
      }
      setInput('')
      return
    }
    const context = mergeContext(baseContext, { documentId, selectionText })
    const history = messages.map((m): { role: 'user' | 'assistant'; content: string } => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))
    const res = await provider.chat({ input, context, history })
    setMessages((prev) => [...prev, ...res.messages])
    setInput('')
  }, [input, provider, baseContext, documentId, selectionText, streaming, messages])

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

function mergeContext(base: AssistantContext, overrides: { documentId?: string; selectionText?: string }): AssistantContext {
  const next: AssistantContext = { ...base }
  if (overrides.documentId && overrides.documentId.trim()) next.documentId = overrides.documentId
  if (overrides.selectionText && overrides.selectionText.trim()) next.selectionText = overrides.selectionText
  return next
}
