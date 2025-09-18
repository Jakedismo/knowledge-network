"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Upload, AudioLines, Sparkles, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import type { TranscriptionResult } from '@/lib/assistant/types'

export function AssistantCaptureTool() {
  const { provider, context } = useAssistantRuntime()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<TranscriptionResult | null>(null)
  const [autoDraft, setAutoDraft] = useState(true)
  const [draftBanner, setDraftBanner] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [pttEnabled, setPttEnabled] = useState(false)
  const [pttKey, setPttKey] = useState<'v' | ' ' | 'm'>('v')
  const [ariaMsg, setAriaMsg] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const persistDraft = useCallback(
    (payload: { transcript: string; summary?: string; actionItems: TranscriptionResult['actionItems'] }) => {
      const storagePayload = {
        title: `Meeting draft ${new Date().toLocaleString()}`,
        ...payload,
      }
      try {
        localStorage.setItem('assistant:auto-draft', JSON.stringify(storagePayload))
        setDraftBanner('Draft stored. Open “Create Document” to convert the transcription into a knowledge page.')
      } catch (error) {
        console.warn('Unable to persist draft', error)
      }
    },
    []
  )

  const handleResult = useCallback(
    (res: TranscriptionResult) => {
      setResult(res)
      if (autoDraft) {
        persistDraft({ transcript: res.transcript, summary: res.summary, actionItems: res.actionItems })
      }
    },
    [autoDraft, persistDraft]
  )

  const transcribeBytes = useCallback(
    async (fileName: string, bytes: Uint8Array) => {
      setBusy(true)
      setDraftBanner(null)
      try {
        // Prefer provider API, but ensure headers are present for dev anon when not logged in
        const response = await provider.transcribe({ fileName, bytes, context })
        handleResult(response)
      } catch (error) {
        // Fallback: call REST directly with auth/dev headers
        try {
          const view = bytes
          const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
          const blob = new Blob([buffer], { type: 'application/octet-stream' })
          const fd = new FormData()
          fd.set('file', new File([blob], fileName))
          const res = await fetch('/api/ai/transcribe', { method: 'POST', headers: getAuthHeader(), body: fd })
          if (!res.ok) throw new Error(await res.text())
          const data = (await res.json()) as TranscriptionResult
          handleResult(data)
        } catch (e2) {
          console.error('Transcription failed', e2)
        }
      } finally {
        setBusy(false)
      }
    },
    [provider, context, handleResult]
  )

  const handleFile = useCallback(
    async (file: File) => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      void transcribeBytes(file.name, bytes)
    },
    [transcribeBytes]
  )

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const bytes = new Uint8Array(await blob.arrayBuffer())
        void transcribeBytes('live-capture.webm', bytes)
        stream.getTracks().forEach((track) => track.stop())
        setRecording(false)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setAriaMsg('Recording started')
    } catch (error) {
      console.error('Microphone permission denied', error)
    }
  }, [transcribeBytes])

  const stopRecording = useCallback(() => {
    if (recording) setAriaMsg('Recording stopped')
    mediaRecorderRef.current?.stop()
  }, [recording])

  // Push-to-talk key handlers (hold V by default)
  useEffect(() => {
    if (!pttEnabled) return
    const down = async (e: KeyboardEvent) => {
      // Only when not typing into inputs
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable) return
      // Check key
      const match = (pttKey === ' ' ? e.code === 'Space' : e.key.toLowerCase() === pttKey)
      if (!match || e.repeat) return
      if (!recording && !busy) {
        e.preventDefault()
        await startRecording()
      }
    }
    const up = (e: KeyboardEvent) => {
      const match = (pttKey === ' ' ? e.code === 'Space' : e.key.toLowerCase() === pttKey)
      if (!match) return
      if (recording) {
        e.preventDefault()
        stopRecording()
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [pttEnabled, pttKey, busy, recording, startRecording, stopRecording])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Mic className="h-3.5 w-3.5" /> Capture & Transcribe
        </div>
        <p className="mt-1">
          Record meetings or upload audio and the assistant will craft summaries, extract action items, and stage a
          draft knowledge document.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="assistant-auto-draft"
              checked={autoDraft}
              onCheckedChange={(checked) => setAutoDraft(Boolean(checked))}
            />
            <Label htmlFor="assistant-auto-draft" className="text-sm">
              Auto-stage draft after transcription
            </Label>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" /> Powered by OpenAI Agents
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={recording ? stopRecording : startRecording} disabled={busy}>
            {recording ? 'Stop capture' : 'Start live capture'}
          </Button>
          <Button type="button" variant="outline" className="flex items-center gap-2" asChild>
            <label className="flex cursor-pointer items-center gap-2">
              <Upload className="h-4 w-4" /> Upload audio
              <input
                type="file"
                className="hidden"
                accept="audio/*,video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleFile(file)
                  event.target.value = ''
                }}
              />
            </label>
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" />
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={pttEnabled}
                onChange={(e) => setPttEnabled(e.target.checked)}
              />
              Push-to-talk
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
          </div>
          {busy ? <span className="text-xs text-muted-foreground">Processing transcription…</span> : null}
        </div>
        {draftBanner ? (
          <div className="rounded border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            {draftBanner}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto rounded border bg-background">
        <div className="sr-only" aria-live="polite">{ariaMsg}</div>
        {result ? (
          <div className="space-y-4 p-4">
            {result.summary ? (
              <div className="rounded border bg-muted/20 p-3">
                <h4 className="text-sm font-semibold">Summary</h4>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </div>
            ) : null}
            <div className="rounded border bg-muted/10 p-3">
              <h4 className="text-sm font-semibold">Transcript</h4>
              <p className="text-sm whitespace-pre-line text-muted-foreground">{result.transcript}</p>
            </div>
            {result.actionItems.length > 0 ? (
              <div className="rounded border bg-muted/20 p-3">
                <h4 className="text-sm font-semibold">Action items</h4>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {result.actionItems.map((item) => (
                    <li key={item.id}>
                      {item.text}
                      {item.owner ? ` — ${item.owner}` : ''}
                      {item.due ? ` (due ${item.due})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <AudioLines className="h-5 w-5" />
            <p>Capture a meeting or upload audio to generate a structured knowledge draft.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AssistantCaptureTool

function getAuthHeader(): Record<string, string> {
  try {
    if (typeof window !== 'undefined') {
      const bearer = window.localStorage.getItem('auth-token')
      const headers: Record<string, string> = {}
      if (bearer) headers.Authorization = `Bearer ${bearer}`
      if (!bearer) {
        const raw = window.localStorage.getItem('auth_tokens')
        if (raw) {
          const parsed = JSON.parse(raw) as { accessToken?: string }
          if (parsed?.accessToken) headers.Authorization = `Bearer ${parsed.accessToken}`
        }
      }
      if (!headers['x-user-id'] && process.env.NEXT_PUBLIC_DEV_USER_ID) headers['x-user-id'] = String(process.env.NEXT_PUBLIC_DEV_USER_ID)
      if (!headers['x-workspace-id'] && process.env.NEXT_PUBLIC_DEV_WORKSPACE_ID) headers['x-workspace-id'] = String(process.env.NEXT_PUBLIC_DEV_WORKSPACE_ID)
      return headers
    }
  } catch {}
  return {}
}
