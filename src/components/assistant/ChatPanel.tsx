"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import Link from 'next/link'
import type { AssistantContext, ChatMessage } from '@/lib/assistant/types'
import { Mic } from 'lucide-react'
import { RealtimeClient } from '@/lib/assistant/realtime'

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
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const mediaChunksRef = useRef<BlobPart[]>([])
  const realtimeRef = useRef<RealtimeClient | null>(null)

  const rtcChatRef = useRef<RealtimeClient | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [showDiag, setShowDiag] = useState(false)
  const [realtimeDiag, setRealtimeDiag] = useState<{ lastError?: string; model?: string; lastAt?: string } | null>(null)
  const [eventLog, setEventLog] = useState<Array<{ ts: string; name: string; data: string }>>([])
  const [copied, setCopied] = useState(false)
  const [sdkDiag, setSdkDiag] = useState<{
    module?: string
    exports?: string[]
    ctor?: string | null
    connectOK?: boolean | null
    error?: string
  } | null>(null)

  async function runRealtimeSdkCheck() {
    try {
      // Get ephemeral token first
      const res = await fetch('/api/ai/realtime/session', { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      const { clientSecret, model } = await res.json()
      // Try imports
      let mod: any = null
      let moduleName = ''
      try {
        mod = await import('@openai/agents-realtime')
        moduleName = '@openai/agents-realtime'
      } catch {
        try {
          mod = await import('@openai/agents')
          moduleName = '@openai/agents'
        } catch {}
      }
      if (!mod) {
        setSdkDiag({ module: 'unavailable', error: 'SDK not found' })
        return
      }
      const keys = Object.keys(mod)
      const ctors = ['RealtimeSession', 'OpenAIRealtimeWebRTC', 'OpenAIRealtimeSession']
      const found = ctors.find((k) => (mod as any)[k]) || null
      let connectOK: boolean | null = null
      if (found === 'RealtimeSession' || found === 'OpenAIRealtimeSession') {
        try {
          const Session = (mod as any)[found]
          const session = new Session({ model })
          try {
            await session.connect({ apiKey: clientSecret })
          } catch {
            await session.connect({ clientSecret })
          }
          connectOK = true
          try { await session.disconnect?.() } catch {}
        } catch (e) {
          connectOK = false
        }
      } else if (found === 'OpenAIRealtimeWebRTC') {
        // Constructor present; actual attach/transport happens in our code paths
        connectOK = null
      }
      setSdkDiag({ module: moduleName, exports: keys.slice(0, 50), ctor: found, connectOK })
    } catch (e: any) {
      setSdkDiag({ error: e?.message || String(e) })
    }
  }

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
      // Try Realtime text streaming
      try {
        let rtc = rtcChatRef.current
        if (!rtc) {
          rtc = new RealtimeClient()
          rtcChatRef.current = rtc
          try {
            const info = await rtc.connect()
            setRealtimeDiag((prev) => ({ ...(prev || {}), model: info?.model, lastAt: new Date().toISOString() }))
          } catch (e: any) {
            setRealtimeDiag((prev) => ({ ...(prev || {}), lastError: e?.message || String(e), lastAt: new Date().toISOString() }))
            throw e
          }
          if (audioRef.current) rtc.attachAudio(audioRef.current)
        }
        // Route partial and final to the last assistant bubble
        rtc.setHandlers({
          onPartial: (delta) => {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') last.content += String(delta || '')
              return next
            })
          },
          onFinal: (text) => {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') last.content = formatAssistantContent(String(text || ''))
              return next
            })
          },
          onError: (e) => setRealtimeDiag((prev) => ({ ...(prev || {}), lastError: String((e as any)?.message || e), lastAt: new Date().toISOString() })),
          onAny: (name, data) => setEventLog((prev) => {
            const entry = { ts: new Date().toISOString(), name: String(name), data: safeDataPreview(data) }
            const next = [...prev, entry]
            return next.slice(-50)
          }),
        })
        await rtc.sendText(effective)
        setInput('')
        return
      } catch {
        // Fall back to existing non-stream execution
      }

      // Fallback (non-stream): existing API
      const context = mergeContext(baseContext, { documentId, selectionText })
      const history = messages.map((m): { role: 'user' | 'assistant'; content: string } => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))
      try {
        const resp = await fetch('/api/ai/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(getAuthHeader()) },
          body: JSON.stringify({ capability: 'chat', input: { question: effective, context, history } }),
          signal: controller.signal,
        })
        if (resp.ok) {
          const payload = await resp.json()
          if (payload?.type === 'chat' && Array.isArray(payload?.data?.messages)) {
            setMessages((prev) => {
              const trimmed = prev.slice(0, -1)
              return [...trimmed, ...normalizeAssistantMessages(payload.data.messages)]
            })
          }
        }
      } finally {
        setInput('')
      }
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

  // Detect tool call pattern in final text and execute via local tools API
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || !last.content) return
    const maybe = detectToolCall(last.content)
    if (!maybe) return
    ;(async () => {
      try {
        const res = await fetch('/api/ai/tools/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(getAuthHeader()) },
          body: JSON.stringify(maybe),
        })
        const data = await res.json()
        const now = new Date().toISOString()
        const content = data?.result
          ? JSON.stringify({ tool_result: { name: maybe.name, result: data.result } })
          : JSON.stringify({ tool_error: { name: maybe.name, error: data?.error || String(res.status) } })
        setMessages((prev) => [...prev, { id: `a:${now}`, role: 'assistant', content, createdAt: now }])
      } catch {}
    })()
  }, [messages])

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

  async function startDictation() {
    try {
      // Prefer Realtime client: live mic -> GPT Realtime -> transcript
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const rtc = new RealtimeClient({
            onPartial: (t) => setInput(String(t || '')),
            onFinal: (t) => {
              const s = String(t || '')
              setInput(s)
              if (s.trim()) void send(s)
            },
            onError: (e) => setRealtimeDiag({ lastError: String((e as any)?.message || e), lastAt: new Date().toISOString(), model: realtimeDiag?.model }),
            onAny: (name, data) => setEventLog((prev) => {
              const entry = { ts: new Date().toISOString(), name: String(name), data: safeDataPreview(data) }
              const next = [...prev, entry]
              return next.slice(-50)
            }),
          })
          realtimeRef.current = rtc
          try {
            const info = await rtc.connect()
            setRealtimeDiag((prev) => ({ ...(prev || {}), model: info?.model, lastAt: new Date().toISOString() }))
          } catch (e: any) {
            setRealtimeDiag((prev) => ({ ...(prev || {}), lastError: e?.message || String(e), lastAt: new Date().toISOString() }))
            throw e
          }
          await rtc.startMicrophone()
          setDictating(true)
          setDictationMsg('Listening… release key to send')
          return
        } catch {
          // fall through to REST chunk path
        }
        // REST fallback: short recording then POST to /api/ai/transcribe
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const rec = new MediaRecorder(stream)
        mediaChunksRef.current = []
        rec.ondataavailable = (e) => { if (e.data.size > 0) mediaChunksRef.current.push(e.data) }
        rec.onstart = () => { setDictating(true); setDictationMsg('Listening… release key to send') }
        rec.onstop = async () => {
          const blob = new Blob(mediaChunksRef.current, { type: rec.mimeType || 'audio/webm' })
          const bytes = new Uint8Array(await blob.arrayBuffer())
          try {
            const fd = new FormData()
            fd.append('file', new File([bytes], 'ask-dictation.webm', { type: 'audio/webm' }))
            const res = await fetch('/api/ai/transcribe', { method: 'POST', headers: getAuthHeader(), body: fd })
            if (res.ok) {
              const data = await res.json()
              const t = String(data?.transcript ?? '')
              setInput(t)
              if (t.trim()) void send(t)
            }
          } catch {}
          stream.getTracks().forEach((t) => t.stop())
          setDictationMsg('')
          setDictating(false)
        }
        mediaRecRef.current = rec
        rec.start()
        return
      }
      // Fallback to Web Speech API
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
      if (realtimeRef.current) {
        void realtimeRef.current.stopMicrophone()
        void realtimeRef.current.disconnect()
        realtimeRef.current = null
      } else if (mediaRecRef.current) {
        mediaRecRef.current.stop()
      } else {
        recRef.current?.stop()
      }
    } catch {}
    recRef.current = null
    setDictating(false)
    setDictationMsg('')
    if (!mediaRecRef.current && !realtimeRef.current && sendIt && input.trim()) void send(input)
  }

  const listRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = useCallback(() => {
    try { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) } catch {}
  }, [])
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-2 border-b p-2 text-xs text-muted-foreground">
        {/* Call-style HUD */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 ${rtcChatRef.current ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <span className={`h-2 w-2 rounded-full ${rtcChatRef.current ? 'bg-emerald-500' : 'bg-muted-foreground'}`} aria-hidden />
            {rtcChatRef.current ? 'Connected' : 'Idle'}
          </span>
          {dictating ? <span className="text-foreground">Live mic</span> : null}
          <button
            type="button"
            className="rounded border bg-background px-2 py-1 text-[11px] hover:bg-muted/40"
            onClick={() => {
              if (dictating) stopDictation(false)
              else startDictation()
            }}
          >
            {dictating ? 'Mute' : 'Unmute'}
          </button>
          <button
            type="button"
            className="rounded border bg-background px-2 py-1 text-[11px] hover:bg-muted/40"
            onClick={() => {
              try { rtcChatRef.current?.disconnect() } catch {}
              rtcChatRef.current = null
              setDictating(false)
            }}
          >
            End
          </button>
          <button
            type="button"
            className="rounded border bg-background px-2 py-1 text-[11px] hover:bg-muted/40"
            onClick={() => setShowDiag((v) => !v)}
          >
            Details
          </button>
          {showDiag ? (
            <div className="z-10 max-w-xs rounded border bg-background p-2 text-[11px] text-foreground shadow">
              <div>Model: {realtimeDiag?.model || process.env.NEXT_PUBLIC_REALTIME_MODEL || 'gpt-realtime'}</div>
              <div>Last: {realtimeDiag?.lastAt || '—'}</div>
              <div className="text-amber-700">{realtimeDiag?.lastError ? `Error: ${realtimeDiag.lastError}` : ''}</div>
              <div className="text-muted-foreground">Beta: realtime=v1</div>
              {!rtcChatRef.current ? (
                <button
                  type="button"
                  className="mt-1 rounded border bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted/40"
                  onClick={async () => {
                    try {
                      const rtc = new RealtimeClient()
                      rtcChatRef.current = rtc
                      const info = await rtc.connect()
                      if (audioRef.current) rtc.attachAudio(audioRef.current)
                      setRealtimeDiag((prev) => ({ ...(prev || {}), model: info?.model, lastAt: new Date().toISOString() }))
                    } catch (e: any) {
                      setRealtimeDiag((prev) => ({ ...(prev || {}), lastError: e?.message || String(e), lastAt: new Date().toISOString() }))
                    }
                  }}
                >
                  Connect
                </button>
              ) : null}
              <button
                type="button"
                className="ml-1 mt-1 rounded border bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted/40"
                onClick={() => runRealtimeSdkCheck()}
              >
                Check SDK
              </button>
              {sdkDiag ? (
                <div className="mt-1 space-y-1 rounded border bg-muted/20 p-1">
                  <div>Module: {sdkDiag.module || '—'}</div>
                  <div>Ctor: {sdkDiag.ctor || '—'}</div>
                  <div>Connect test: {sdkDiag.connectOK === true ? 'OK' : sdkDiag.connectOK === false ? 'Failed' : 'n/a'}</div>
                  {sdkDiag.error ? <div className="text-amber-700">{sdkDiag.error}</div> : null}
                </div>
              ) : null}
              <details className="mt-2">
                <summary>Event log</summary>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground">Last {eventLog.length} events</span>
                  <button
                    type="button"
                    className="rounded border bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted/40"
                    onClick={async () => {
                      const text = eventLog
                        .map((e) => `[${e.ts}] ${e.name}\n${e.data}`)
                        .join('\n\n') || 'No events.'
                      try {
                        if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
                        else {
                          const ta = document.createElement('textarea')
                          ta.value = text
                          document.body.appendChild(ta)
                          ta.select()
                          document.execCommand('copy')
                          document.body.removeChild(ta)
                        }
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      } catch {}
                    }}
                  >
                    {copied ? 'Copied' : 'Copy log'}
                  </button>
                </div>
                <div className="mt-1 max-h-48 overflow-auto rounded border bg-muted/30 p-1">
                  {eventLog.length === 0 ? (
                    <div className="p-1 text-muted-foreground">No events</div>
                  ) : (
                    eventLog.map((ev, idx) => (
                      <div key={idx} className="border-b p-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{ev.name}</span>
                          <span className="text-[10px] text-muted-foreground">{ev.ts}</span>
                        </div>
                        <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground">{ev.data}</pre>
                      </div>
                    ))
                  )}
                </div>
              </details>
            </div>
          ) : null}
        </div>
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
      {/* hidden audio element for Realtime TTS playback */}
      <audio ref={audioRef} className="hidden" autoPlay />
      <div ref={listRef} className="flex-1 min-h-0 overflow-auto p-3 space-y-3" aria-live="polite">
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
              ) : m.role === 'assistant' && detectStructuredPayload(m.content) ? (
                <div className="inline-block max-w-[85%] rounded px-3 py-2 text-sm bg-muted text-foreground">
                  <StructuredPayloadRenderer data={parseStructuredPayload(m.content)!} />
                </div>
              ) : m.role === 'assistant' && detectToolResultPayload(m.content) ? (
                <div className="inline-block max-w-[85%] rounded px-3 py-2 text-sm bg-muted text-foreground">
                  <ToolResultRenderer data={parseToolResultPayload(m.content)!} />
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
        <div ref={endRef} />
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

function parseToolList(text: string): Array<{ id?: string; title?: string; snippet?: string; path?: string; url?: string; kind?: string; tags?: string[]; categories?: string[] }> {
  const parsed = safeParseJson(text)
  if (!parsed) return []
  const arr = Array.isArray(parsed) ? parsed : parsed.items
  if (!Array.isArray(arr)) return []
  return arr as any
}

function safeParseJson(text: string): any | null {
  const t = (text || '').trim()
  if (!(t.startsWith('{') || t.startsWith('['))) return null
  try { return JSON.parse(t) } catch { return null }
}

function detectStructuredPayload(text: string): boolean {
  const obj = safeParseJson(text)
  if (!obj || Array.isArray(obj) || typeof obj !== 'object') return false
  return Boolean(
    obj.status || obj.message || obj.required_fields || obj.optional_fields || obj.sample_payload || obj.next_steps
  )
}

function parseStructuredPayload(text: string): any | null {
  const obj = safeParseJson(text)
  if (!obj || Array.isArray(obj) || typeof obj !== 'object') return null
  const clean = (s: any) => cleanText(String(s ?? ''))
  return {
    status: clean(obj.status ?? obj.statusstatus),
    message: clean(obj.message ?? obj.messagemessage),
    context: obj.context ?? {},
    required: normalizeFieldList(obj.required_fields ?? obj.required_fields_fields),
    optional: normalizeFieldList(obj.optional_fields ?? obj.optional_fields_fields),
    sample: obj.sample_payload ?? obj.sample_payload_payload ?? null,
    next: Array.isArray(obj.next_steps ?? obj.next_steps_steps)
      ? (obj.next_steps ?? obj.next_steps_steps).map((x: any) => clean(x))
      : [],
    note: clean(obj.security_note ?? obj.security_note_note),
  }
}

function normalizeFieldList(list: any): Array<{ name: string; type?: string; example?: string; note?: string; allowed?: string[] }> {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => {
      const it = Array.isArray(item) ? item[0] : item
      const name = it?.name ?? it?.name_name
      if (!name) return null
      return {
        name: cleanText(String(name)),
        type: it?.type ? String(it.type) : undefined,
        example: it?.example ? cleanText(String(it.example)) : undefined,
        note: it?.note ? cleanText(String(it.note)) : undefined,
        allowed: Array.isArray(it?.allowed_values ?? it?.allowed_values_values)
          ? (it.allowed_values ?? it.allowed_values_values).map((v: any) => cleanText(String(v)))
          : undefined,
      }
    })
    .filter(Boolean) as any
}

function StructuredPayloadRenderer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.message ? <div className="font-medium text-foreground">{data.message}</div> : null}
      {data.required && data.required.length ? (
        <div>
          <div className="text-xs font-semibold text-foreground">Required fields</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {data.required.map((f: any) => (
              <span key={f.name} className="rounded border bg-background px-1.5 py-0.5 text-[11px]">
                {f.name}
                {f.type ? <em className="ml-1 text-muted-foreground">({f.type})</em> : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {data.optional && data.optional.length ? (
        <div>
          <div className="text-xs font-semibold text-foreground">Optional fields</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {data.optional.map((f: any) => (
              <span key={f.name} className="rounded border bg-background px-1.5 py-0.5 text-[11px]">
                {f.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {data.sample ? (
        <div>
          <div className="text-xs font-semibold text-foreground">Sample payload</div>
          <pre className="mt-1 max-h-48 overflow-auto rounded border bg-background p-2 text-xs">
            {JSON.stringify(deDupeJsonStrings(data.sample), null, 2)}
          </pre>
        </div>
      ) : null}
      {data.next && data.next.length ? (
        <div>
          <div className="text-xs font-semibold text-foreground">Next steps</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
            {data.next.map((s: string, i: number) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.note ? <div className="text-xs text-muted-foreground">{data.note}</div> : null}
    </div>
  )
}

function deDupeJsonStrings(obj: any): any {
  if (obj == null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deDupeJsonStrings)
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    out[cleanText(k)] = typeof v === 'string' ? cleanText(v) : deDupeJsonStrings(v)
  }
  return out
}

function cleanText(s: string): string {
  let t = (s || '').trim()
  // collapse duplicated words (>=2 chars)
  t = t.replace(/\b(\w{2,})\s+\1\b/gi, '$1')
  // collapse duplicated punctuation
  t = t.replace(/([,.:;])\1+/g, '$1')
  // normalize spaces
  t = t.replace(/\s{2,}/g, ' ')
  return t
}

// Inline Tool Results
function detectToolResultPayload(text: string): boolean {
  const obj = safeParseJson(text)
  return Boolean(obj && typeof obj === 'object' && !Array.isArray(obj) && (obj as any).tool_result)
}

function parseToolResultPayload(text: string): { name: string; result: any } | null {
  const obj = safeParseJson(text)
  if (!obj || Array.isArray(obj) || typeof obj !== 'object') return null
  const tr = (obj as any).tool_result
  if (!tr || typeof tr !== 'object') return null
  return { name: String(tr.name || ''), result: (tr as any).result }
}

function ToolResultRenderer({ data }: { data: { name: string; result: any } }) {
  const { name, result } = data
  if (Array.isArray(result)) {
    // Reuse list renderers (detect template results by kind)
    const items = result as Array<any>
    const isTemplates = items.length > 0 && items.every((it) => it?.kind === 'template')
    return isTemplates ? <TemplateGridRenderer items={items} /> : <ToolListRenderer items={items} />
  }

  if (result && typeof result === 'object') {
    // Common shapes
    const title = (result as any).title || (result as any).name || data.name
    const path = (result as any).path
    const visibility = (result as any).visibility
    const status = (result as any).status
    return (
      <div className="space-y-2">
        <div className="rounded border bg-background p-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">{String(title || name)}</div>
            {status ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">{String(status)}</span> : null}
            {visibility ? <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800">{String(visibility)}</span> : null}
          </div>
          {path ? (
            <div className="mt-2">
              <Link href={String(path)} prefetch className="text-sm underline">
                Open
              </Link>
            </div>
          ) : null}
        </div>
        {/* Raw data expander (minimal) */}
        <details className="text-xs text-muted-foreground">
          <summary>Details</summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded border bg-background p-2">{JSON.stringify(result, null, 2)}</pre>
        </details>
      </div>
    )
  }

  if ((result as any)?.ok) {
    return <div className="rounded border bg-background p-2 text-sm">Tool {name} completed.</div>
  }

  return (
    <div className="rounded border bg-background p-2 text-sm">
      {typeof result === 'string' ? result : 'Tool completed.'}
    </div>
  )
}

function shouldShowConfirm(msgs: ChatMessage[]): boolean {
  if (msgs.length === 0) return false
  const last = msgs[msgs.length - 1]
  if (last.role !== 'assistant') return false
  const t = (last.content || '').toLowerCase()
  return t.includes('proceed?') || t.includes('confirmation required') || t.includes('confirm=true')
}

function ToolListRenderer({ items = [] }: { items?: Array<{ id?: string; title?: string; snippet?: string; path?: string; url?: string }> }) {
  return (
    <div className="space-y-2">
      {(items || []).map((it, i) => (
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

function TemplateGridRenderer({ items = [] }: { items?: Array<{ id?: string; title?: string; path?: string; tags?: string[]; categories?: string[] }> }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {(items || []).map((it, i) => (
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

function detectToolCall(text: string): { name: string; args: Record<string, unknown> } | null {
  const obj = safeParseJson(text)
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const name = (obj as any)?.tool || (obj as any)?.name
    const args = (obj as any)?.args || (obj as any)?.parameters
    if (typeof name === 'string' && args && typeof args === 'object') {
      return { name, args }
    }
  }
  return null
}

function safeDataPreview(data: unknown): string {
  try {
    if (data == null) return 'null'
    if (typeof data === 'string') return data.slice(0, 500)
    return JSON.stringify(data, null, 2).slice(0, 1000)
  } catch {
    return String(data)
  }
}
