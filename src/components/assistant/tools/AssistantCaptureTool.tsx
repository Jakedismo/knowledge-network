"use client"

import { useCallback, useRef, useState } from 'react'
import { Mic, Upload, AudioLines, Sparkles } from 'lucide-react'
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
        const response = await provider.transcribe({ fileName, bytes, context })
        handleResult(response)
      } catch (error) {
        console.error('Transcription failed', error)
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
    } catch (error) {
      console.error('Microphone permission denied', error)
    }
  }, [transcribeBytes])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

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
          {busy ? <span className="text-xs text-muted-foreground">Processing transcription…</span> : null}
        </div>
        {draftBanner ? (
          <div className="rounded border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            {draftBanner}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto rounded border bg-background">
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
