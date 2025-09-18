"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import Link from 'next/link'
import type { AssistantContext, ChatMessage } from '@/lib/assistant/types'
import { Mic } from 'lucide-react'

interface ChatPanelProps {
  documentId?: string
  selectionText?: string
}

export function ChatPanel({ documentId, selectionText }: ChatPanelProps) {
  const { provider, context: baseContext, mergeContext: mergeGlobalContext } = useAssistantRuntime()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const streaming = process.env.NEXT_PUBLIC_ASSISTANT_STREAM === 'true'
  const [speakReplies, setSpeakReplies] = useState(false)
  const [pttEnabled, setPttEnabled] = useState(false)
  const [pttKey, setPttKey] = useState<'v' | ' ' | 'm'>('v')
  const [dictating, setDictating] = useState(false)
  const [dictationMsg, setDictationMsg] = useState('')
  const recRef = useRef<any>(null)

  const send = useCallback(async (overridePrompt?: string) => {
    const effective = (overridePrompt ?? input).trim()
    if (!effective) return
    if (streaming) {
      const controller = new AbortController()
      const now = new Date().toISOString()
      // Optimistically append user message and empty assistant bubble
      setMessages((prev) => [
        ...prev,
        { id: `u:${now}`, role: 'user', content: effective, createdAt: now },
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
          input: { question: effective, context, history },
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
    const res = await provider.chat({ input: effective, context, history })
    const normalized = normalizeAssistantMessages(res.messages)
    setMessages((prev) => {
      const next = [...prev, ...normalized]
      if (speakReplies) speakLatestAssistant(next)
      return next
    })
    setInput('')
  }, [input, provider, baseContext, documentId, selectionText, streaming, messages])

  // Listen for external chat triggers from the dock examples
  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<{ prompt?: string; context?: Partial<AssistantContext> }>
      const prompt = ce.detail?.prompt?.trim()
      const ctx = ce.detail?.context
      if (ctx && Object.keys(ctx).length) mergeGlobalContext(ctx)
      if (prompt) {
        setInput(prompt)
        void send(prompt)
      }
    }
    window.addEventListener('assistant:chat', handler as EventListener)
    return () => window.removeEventListener('assistant:chat', handler as EventListener)
  }, [mergeGlobalContext, send])

  // Global push-to-talk for Ask: hold key to dictate prompt; release to send
  useEffect(() => {
    if (!pttEnabled) return
    const hasAPI = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    if (!hasAPI) return

    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable) return
      const match = (pttKey === ' ' ? e.code === 'Space' : e.key.toLowerCase() === pttKey)
      if (!match || e.repeat) return
      if (!dictating) {
        e.preventDefault()
        startDictation()
      }
    }
    const up = (e: KeyboardEvent) => {
      const match = (pttKey === ' ' ? e.code === 'Space' : e.key.toLowerCase() === pttKey)
      if (!match) return
      if (dictating) {
        e.preventDefault()
        stopDictation(true)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [pttEnabled, pttKey, dictating])

  function startDictation() {
    try {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) return
      const rec = new SR()
      rec.lang = (navigator as any).language || 'en-US'
      rec.continuous = false
      rec.interimResults = true
      let transcript = ''
      rec.onstart = () => {
        setDictating(true)
        setDictationMsg('Listening… release key to send')
      }
      rec.onresult = (ev: any) => {
        let interim = ''
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i]
          if (res.isFinal) transcript += res[0].transcript
          else interim += res[0].transcript
        }
        setInput((transcript + ' ' + interim).trim())
      }
      rec.onerror = () => {
        setDictationMsg('')
        setDictating(false)
      }
      rec.onend = () => {
        setDictationMsg('')
        setDictating(false)
      }
      recRef.current = rec
      rec.start()
    } catch {
      // ignore
    }
  }

  function stopDictation(sendIt: boolean) {
    try {
      recRef.current?.stop()
    } catch {}
    recRef.current = null
    setDictating(false)
    setDictationMsg('')
    if (sendIt && input.trim()) void send(input)
  }

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Auto-scroll to latest on new messages
    try {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    } catch {}
  }, [messages])

  return (
    <div className="flex h-full w-full flex-col rounded-lg border bg-background">
      <div className="flex items-center justify-end gap-2 border-b p-2 text-xs text-muted-foreground">
        <label className="inline-flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            className="h-3 w-3"
            checked={speakReplies}
            onChange={(e) => setSpeakReplies(e.target.checked)}
          />
          Speak replies
        </label>
        <span className="mx-2 h-3 w-px bg-border" />
        <label className="inline-flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            className="h-3 w-3"
            checked={pttEnabled}
            onChange={(e) => setPttEnabled(e.target.checked)}
          />
          Push‑to‑talk
        </label>
        <select
          className="rounded border bg-background px-1.5 py-0.5"
          value={pttKey}
          onChange={(e) => setPttKey(e.target.value as any)}
          aria-label="Push-to-talk key"
          disabled={!pttEnabled}
        >
          <option value="v">Hold V</option>
          <option value=" ">Hold Space</option>
          <option value="m">Hold M</option>
        </select>
        {dictating ? <span aria-live="polite">{dictationMsg}</span> : null}
      </div>
      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ask a question about your document or workspace…</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              {m.role === 'assistant' && detectToolList(m.content) ? (
                <div className="inline-block max-w-[85%] rounded px-3 py-2 text-sm bg-muted text-foreground">
                  {useTemplateRenderer(parseToolList(m.content)!) ? (
                    <TemplateGridRenderer items={parseToolList(m.content)!} />
                  ) : (
                    <ToolListRenderer items={parseToolList(m.content)!} />
                  )}
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
          type="button"
          className="rounded border bg-background px-2 py-2 text-sm hover:bg-muted/40"
          aria-pressed={dictating}
          aria-label={dictating ? 'Stop dictation and send' : 'Start dictation'}
          onClick={() => (dictating ? stopDictation(true) : startDictation())}
          title={dictating ? 'Stop and send' : 'Start dictation'}
        >
          <Mic className={`h-4 w-4 ${dictating ? 'text-primary' : ''}`} />
        </button>
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

function parseToolList(text: string): Array<{ id?: string; title?: string; snippet?: string; path?: string; url?: string; kind?: string; tags?: string[]; categories?: string[] }> | null {
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
            ) : it.path ? (
              <Link className="underline" href={it.path} prefetch>
                {it.title ?? it.id ?? 'Item'}
              </Link>
            ) : it.id ? (
              <Link className="underline" href={`/knowledge/${it.id}`} prefetch>
                {it.title ?? it.id}
              </Link>
            ) : (
              <span>{it.title ?? 'Item'}</span>
            )}
          </div>
          {it.kind === 'template' ? (
            <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800">Template</div>
          ) : null}
          {it.path ? <div className="text-xs text-muted-foreground">{it.path}</div> : null}
          {it.snippet ? <div className="mt-1 text-sm">{it.snippet}</div> : null}
          {(it as any).tags && Array.isArray((it as any).tags) && (it as any).tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {(it as any).tags.map((t: string) => (
                <button
                  key={t}
                  type="button"
                  className="rounded border bg-background px-1.5 py-0.5 text-[11px] hover:bg-muted/40"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('assistant:chat', {
                        detail: { prompt: `Search documents tagged ${JSON.stringify(t)} show 10` },
                      })
                    )
                  }
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function useTemplateRenderer(items: Array<{ kind?: string }>): boolean {
  if (!items || items.length === 0) return false
  const sample = items.slice(0, Math.min(5, items.length))
  return sample.every((it) => (it as any).kind === 'template')
}

function TemplateGridRenderer({ items }: { items: Array<{ id?: string; title?: string; path?: string; tags?: string[]; categories?: string[] }> }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={it.id ?? i} className="rounded border bg-background p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="font-medium">
              {it?.path ? (
                <Link className="underline" href={it.path} prefetch>
                  {it.title ?? it.id ?? 'Template'}
                </Link>
              ) : (
                <span>{it.title ?? it.id ?? 'Template'}</span>
              )}
            </div>
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800">Template</span>
          </div>
          {(it.categories && it.categories.length) || (it.tags && it.tags.length) ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {(it.categories ?? []).map((c) => (
                <button
                  key={`c-${c}`}
                  type="button"
                  className="rounded border bg-background px-1.5 py-0.5 text-[11px] hover:bg-muted/40"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('assistant:chat', {
                        detail: { prompt: `Search templates q ${JSON.stringify(c)}` },
                      })
                    )
                  }
                >
                  {c}
                </button>
              ))}
              {(it.tags ?? []).map((t) => (
                <button
                  key={`t-${t}`}
                  type="button"
                  className="rounded border bg-background px-1.5 py-0.5 text-[11px] hover:bg-muted/40"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('assistant:chat', {
                        detail: { prompt: `Search templates q ${JSON.stringify(t)}` },
                      })
                    )
                  }
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted/50"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('assistant:chat', {
                    detail: {
                      prompt: `Use apply_template_from_context for template "${it.id}" with title "New from ${it.title ?? it.id}". Propose change and ask to proceed.`,
                    },
                  })
                )
              }
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted/50"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('assistant:chat', {
                    detail: {
                      prompt: `Publish template ${it.id} as PUBLIC titled ${JSON.stringify(it.title ?? 'Template')} with tags ${(it.tags ?? []).slice(0, 3).join(', ')}. Summarize and ask to proceed.`,
                  },
                  })
                )
              }
            >
              Publish
            </button>
            <button
              type="button"
              className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted/50"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('assistant:chat', {
                    detail: {
                      prompt: `Share template ${it.id} with role engineering-editor permission template:use. Summarize and ask to proceed.`,
                    },
                  })
                )
              }
            >
              Share
            </button>
            {it?.path ? (
              <Link href={it.path} prefetch className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted/50">
                Open
              </Link>
            ) : null}
          </div>
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

function speakLatestAssistant(all: ChatMessage[]) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const last = [...all].reverse().find((m) => m.role === 'assistant')
    if (!last?.content) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(stripMarkdown(last.content).slice(0, 1000))
    utter.rate = 1
    utter.pitch = 1
    window.speechSynthesis.speak(utter)
  } catch {
    // ignore
  }
}

function stripMarkdown(s: string): string {
  return s.replace(/`{1,3}[\s\S]*?`{1,3}/g, '').replace(/[*_#>\[\]()~-]/g, '')
}
