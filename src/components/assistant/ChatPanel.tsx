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
        headers: { 'Content-Type': 'application/json', ...(getAuthHeader()) },
        body: JSON.stringify({
          capability: 'chat',
          input: { question: input, context, history },
          stream: true,
        }),
        signal: controller.signal,
      })
      if (!resp.ok) { setInput(''); return }

      // Fallback: if server couldn't stream (e.g., Agents SDK path), it will return JSON
      const ctype = resp.headers.get('content-type') || ''
      if (!ctype.includes('text/event-stream')) {
        try {
          const payload = await resp.json()
          if (payload?.type === 'chat' && Array.isArray(payload?.data?.messages)) {
            setMessages((prev) => {
              // Remove the optimistic assistant bubble before appending real messages
              const trimmed = prev.slice(0, -1)
              return [...trimmed, ...payload.data.messages]
            })
          }
        } catch {
          // Ignore JSON parse errors; leave the optimistic assistant empty
        }
        setInput('')
        return
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let sawAnyText = false
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
                const delta = safeParseDataLine(dataLine)
                last.content += delta
                sawAnyText = true
              }
              return next
            })
          }
        }
      }
      // Post-process last assistant message for JSON pretty formatting and de-duplication
      if (sawAnyText) {
        setMessages((prev) => {
          if (prev.length === 0) return prev
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            last.content = formatAssistantContent(last.content)
          }
          return next
        })
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
    const normalized = normalizeAssistantMessages(res.messages)
    setMessages((prev) => [...prev, ...normalized])
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
              {m.role === 'assistant' && detectToolList(m.content) ? (
                <div className="inline-block max-w-[85%] rounded px-3 py-2 text-sm bg-muted text-foreground">
                  <ToolListRenderer items={parseToolList(m.content)!} />
                </div>
              ) : (
                <div
                  className={`inline-block max-w-[85%] rounded px-3 py-2 text-sm ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  {m.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {shouldShowConfirm(messages) ? (
        <ConfirmBar
          onProceed={async () => {
            const ctx = mergeContext(baseContext, { documentId, selectionText, confirm: true })
            const history = messages.map((m): { role: 'user' | 'assistant'; content: string } => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            }))
            const res = await provider.chat({ input: 'Proceed with the proposed change.', context: ctx, history })
            setMessages((prev) => [...prev, ...normalizeAssistantMessages(res.messages)])
          }}
          onCancel={() => setMessages((prev) => [...prev, { id: `u:${Date.now()}`, role: 'user', content: 'Cancel.', createdAt: new Date().toISOString() }])}
        />
      ) : null}
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

function getAuthHeader(): Record<string, string> {
  try {
    if (typeof window !== 'undefined') {
      // Prefer single token used by GraphQL
      const bearer = window.localStorage.getItem('auth-token')
      const headers: Record<string, string> = {}
      if (bearer) headers.Authorization = `Bearer ${bearer}`

      // Fallback to token pair storage
      if (!bearer) {
        const raw = window.localStorage.getItem('auth_tokens')
        if (raw) {
          const parsed = JSON.parse(raw) as { accessToken?: string }
          if (parsed?.accessToken) headers.Authorization = `Bearer ${parsed.accessToken}`
        }
      }

      // Best-effort x-user-id/x-workspace-id to satisfy dev guards
      const payload = decodeJwtPayload(bearer)
      if (payload?.sub) headers['x-user-id'] = String(payload.sub)
      if (payload?.workspaceId) headers['x-workspace-id'] = String(payload.workspaceId)
      // Dev overrides for local testing
      if (!headers['x-user-id'] && process.env.NEXT_PUBLIC_DEV_USER_ID) headers['x-user-id'] = String(process.env.NEXT_PUBLIC_DEV_USER_ID)
      if (!headers['x-workspace-id'] && process.env.NEXT_PUBLIC_DEV_WORKSPACE_ID) headers['x-workspace-id'] = String(process.env.NEXT_PUBLIC_DEV_WORKSPACE_ID)
      return headers
    }
  } catch {
    // ignore
  }
  return {}
}

function decodeJwtPayload(token: string | null): any | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const json = atob(parts[1])
    return JSON.parse(json)
  } catch {
    return null
  }
}

function safeParseDataLine(dataLine: string): string {
  try {
    const parsed = JSON.parse(dataLine)
    return typeof parsed === 'string' ? parsed : String(parsed)
  } catch {
    return dataLine
  }
}

function normalizeAssistantMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) =>
    m.role === 'assistant' ? { ...m, content: formatAssistantContent(m.content) } : m,
  )
}

function formatAssistantContent(text: string): string {
  const trimmed = (text || '').trim()
  const deduped = dedupeRepeatedWords(trimmed)
  const maybe = tryFormatJson(deduped)
  return maybe ?? deduped
}

function dedupeRepeatedWords(s: string): string {
  // Collapse immediate duplicated words like "TitleTitle" -> "Title" and "DocumentDocument" -> "Document"
  // Also collapse duplicated tokens separated by single spaces: "Model Model" -> "Model"
  return s
    .replace(/([A-Za-z]{2,})\1/g, '$1')
    .replace(/\b(\w{2,})\s+\1\b/gi, '$1')
}

function tryFormatJson(s: string): string | null {
  if (!s) return null
  const text = s.trim()
  if (!(text.startsWith('{') || text.startsWith('['))) return null
  try {
    const obj = JSON.parse(text)
    // Known shapes: { message, next_steps[], document{}, context{}, prompt }
    if (Array.isArray(obj)) {
      return obj.map((it: any) => `• ${String(it?.title ?? it?.text ?? it)}`).join('\n')
    }
    if (obj && typeof obj === 'object') {
      const lines: string[] = []
      if (obj.message) lines.push(String(obj.message))
      if (obj.document) {
        const d = obj.document
        const title = d?.title ? String(d.title) : 'Document'
        const vis = d?.visibility ? ` (${String(d.visibility)})` : ''
        const path = d?.path ? ` — ${String(d.path)}` : ''
        lines.push(`Document: ${title}${vis}${path}`)
      }
      if (Array.isArray(obj.next_steps) && obj.next_steps.length) {
        lines.push('Next steps:')
        for (const step of obj.next_steps) lines.push(`• ${String(step)}`)
      }
      if (obj.prompt) lines.push(`
${String(obj.prompt)}`)
      if (obj.summary && !obj.message) lines.push(String(obj.summary))
      if (lines.length) return lines.join('\n')
      // Fallback: pretty-print JSON
      return '```json\n' + JSON.stringify(obj, null, 2) + '\n```'
    }
  } catch {
    // ignore
  }
  return null
}

function detectToolList(text: string): boolean {
  const parsed = safeParseJson(text)
  if (!parsed) return false
  if (Array.isArray(parsed)) return parsed.length > 0 && typeof parsed[0] === 'object'
  if (parsed.items && Array.isArray(parsed.items)) return parsed.items.length > 0 && typeof parsed.items[0] === 'object'
  return false
}

function parseToolList(text: string): Array<{ id?: string; title?: string; snippet?: string; path?: string; url?: string }> | null {
  const parsed = safeParseJson(text)
  if (!parsed) return null
  const arr = Array.isArray(parsed) ? parsed : parsed.items
  if (!Array.isArray(arr)) return null
  return arr as any
}

function safeParseJson(text: string): any | null {
  const t = (text || '').trim()
  if (!(t.startsWith('{') || t.startsWith('['))) return null
  try { return JSON.parse(t) } catch { return null }
}

function shouldShowConfirm(msgs: ChatMessage[]): boolean {
  if (msgs.length === 0) return false
  const last = msgs[msgs.length - 1]
  if (last.role !== 'assistant') return false
  const t = (last.content || '').toLowerCase()
  return t.includes('proceed?') || t.includes('confirmation required') || t.includes('confirm=true')
}

function ToolListRenderer({ items }: { items: Array<{ id?: string; title?: string; snippet?: string; path?: string; url?: string }> }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.id ?? i} className="rounded border bg-background p-2 text-left">
          <div className="font-medium">
            {it.url ? (
              <a className="underline" href={it.url} target="_blank" rel="noreferrer">
                {it.title ?? it.id ?? 'Item'}
              </a>
            ) : (
              <span>{it.title ?? it.id ?? 'Item'}</span>
            )}
          </div>
          {it.path ? <div className="text-xs text-muted-foreground">{it.path}</div> : null}
          {it.snippet ? <div className="mt-1 text-sm">{it.snippet}</div> : null}
        </div>
      ))}
    </div>
  )
}

function ConfirmBar({ onProceed, onCancel }: { onProceed: () => void | Promise<void>; onCancel: () => void | Promise<void> }) {
  return (
    <div className="border-t bg-muted/60 p-2 flex items-center justify-end gap-2">
      <button className="rounded border bg-background px-3 py-2 text-sm" onClick={() => void onCancel()} aria-label="Cancel proposed change">Cancel</button>
      <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => void onProceed()} aria-label="Proceed with proposed change">Proceed</button>
    </div>
  )
}
