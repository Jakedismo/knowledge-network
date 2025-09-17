"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { EditorProvider, useEditor } from './EditorProvider'
import { useEditorStore } from './state'
import { Toolbar } from './Toolbar'
import { cn } from '@/lib/utils'
import { useMediaUpload } from './use-media-upload'
import { insertImage, type Selection } from './toolbar-actions'
import { PreviewBlocks } from './PreviewBlocks'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'
import type { EditorModel } from '@/lib/editor/model'
import type { PresenceState } from './hooks/use-collaboration'
import { useCollaboration } from './hooks/use-collaboration'
import { useTypingIndicator } from './hooks/use-typing'
import { PresenceSidebar } from '../collab/PresenceSidebar'
import { SyncIndicator } from '../collab/SyncIndicator'
import { ConflictBanner } from '../collab/ConflictBanner'
import { SelectionOverlay } from '../collab/SelectionOverlay'

type CollaborationConfig = {
  roomId: string
  presence: PresenceState
  transport?: 'broadcast' | 'websocket'
  url?: string
  socketFactory?: (url: string) => any
  token?: string
}

type EditorProps = {
  className?: string
  placeholder?: string
  autoFocus?: boolean
  children?: React.ReactNode
  collaboration?: CollaborationConfig
  onCommentAction?: (commentId: string) => void
  onMentionAction?: (mentionId: string) => void
}

type EditorInnerProps = Omit<EditorProps, 'children' | 'collaboration'>

function EditorInner({ className, placeholder, autoFocus, onCommentAction, onMentionAction }: EditorInnerProps) {
  const { setCommentAction, setMentionAction } = useEditor()
  useEffect(() => {
    setCommentAction?.(onCommentAction ?? (() => {}))
    setMentionAction?.(onMentionAction ?? (() => {}))
    return () => {
      setCommentAction?.(() => {})
      setMentionAction?.(() => {})
    }
  }, [onCommentAction, onMentionAction, setCommentAction, setMentionAction])

  const content = useEditorStore((s) => s.content)
  const mode = useEditorStore((s) => s.mode)
  const setContent = useEditorStore((s) => s.setContent)
  const { setTextareaRef, model, collaborationProvider, collaborationStatus } = useEditor()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const contentRef = useRef(content)
  const { uploadMedia, status: uploadStatus, error } = useMediaUpload()
  const [liveMessage, setLiveMessage] = useState('')
  useTypingIndicator()

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Image upload failed, using local preview URL.', error)
      setLiveMessage('Image upload failed; inserted local preview instead.')
    }
  }, [error])

  useEffect(() => {
    if (collaborationStatus === 'error') {
      setLiveMessage('Collaboration connection error; attempting reconnect…')
    }
  }, [collaborationStatus])

  useEffect(() => {
    const provider = collaborationProvider
    const el = textareaRef.current
    if (!provider || !el) return

    const awareness = provider.awareness

    const updateSelection = () => {
      if (!textareaRef.current) return
      if (mode !== 'write') {
        const state = awareness.getLocalState() ?? {}
        if (state.selection) {
          awareness.setLocalState({ ...state, selection: null })
        }
        return
      }
      const start = textareaRef.current.selectionStart ?? 0
      const end = textareaRef.current.selectionEnd ?? start
      const blocks = model.getBlocks()
      const block = blocks.find((b) => start >= b.start && start <= b.end)
      const state = awareness.getLocalState() ?? { presence: {} }
      if (block) {
        const localStart = Math.max(0, start - block.start)
        const blockLength = block.end - block.start
        const rawEnd = Math.max(0, end - block.start)
        const adjustedEnd = rawEnd === localStart ? Math.min(blockLength, rawEnd + 1) : Math.min(blockLength, rawEnd)
        awareness.setLocalState({
          ...state,
          presence: state.presence ?? {},
          selection: {
            blockId: block.id,
            range: { start: localStart, end: adjustedEnd },
            color: state.presence?.color,
            displayName: state.presence?.displayName,
          },
        })
      } else if (state.selection) {
        awareness.setLocalState({ ...state, selection: null })
      }
    }

    const events: Array<keyof HTMLElementEventMap> = ['keyup', 'mouseup', 'select']
    events.forEach((event) => el.addEventListener(event, updateSelection))
    const handleBlur = () => {
      const state = awareness.getLocalState() ?? {}
      if (state.selection) {
        awareness.setLocalState({ ...state, selection: null })
      }
    }
    el.addEventListener('blur', handleBlur)
    updateSelection()

    return () => {
      events.forEach((event) => el.removeEventListener(event, updateSelection))
      el.removeEventListener('blur', handleBlur)
    }
  }, [collaborationProvider, model, mode])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      // simple bold
      const el = textareaRef.current!
      const start = el.selectionStart
      const end = el.selectionEnd
      const before = contentRef.current.slice(0, start)
      const sel = contentRef.current.slice(start, end)
      const after = contentRef.current.slice(end)
      const next = `${before}**${sel}**${after}`
      contentRef.current = next
      model.updateFromText(next)
      setContent(next)
      requestAnimationFrame(() => el.setSelectionRange(start + 2, end + 2))
    }
  }

  // keep provider API insertAtCursor working with our ref
  useEffect(() => {
    // not exposing ref globally; API methods already target current ref via provider
    // no-op here
  }, [])

  const getSelection = useCallback(() => {
    const el = textareaRef.current
    return {
      start: el?.selectionStart ?? contentRef.current.length,
      end: el?.selectionEnd ?? contentRef.current.length,
    }
  }, [])

  const apply = useCallback(
    (
      fn: (text: string, selection: Selection) => { next: string; newSel: Selection },
      selection?: Selection
    ) => {
      const el = textareaRef.current
      if (!el) return undefined
      const baseSelection = selection ?? getSelection()
      const { next, newSel } = fn(contentRef.current, baseSelection)
      contentRef.current = next
      model.updateFromText(next)
      setContent(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(newSel.start, newSel.end)
      })
      return newSel
    },
    [getSelection, setContent, model]
  )

  const insertUploadedImage = useCallback(
    async (file: File, selection?: Selection) => {
      setLiveMessage(`Uploading image ${file.name}…`)
      const result = await uploadMedia(file)
      const newSel = apply((text, sel) => insertImage(text, sel, result.url, file.name), selection)
      if (result.url.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(result.url), 10_000)
      }
      if (result.error) {
        setLiveMessage(`Upload failed for ${file.name}; inserted local preview.`)
      } else {
        setLiveMessage(`Image uploaded: ${file.name}`)
      }
      return newSel
    },
    [apply, uploadMedia]
  )

  const editorArea = (
    <div className="relative">
      <textarea
        ref={(el) => {
          textareaRef.current = el
          setTextareaRef?.(el)
        }}
        aria-label="Markdown editor"
        className={cn(
          'min-h-[200px] w-full resize-y rounded-md border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring',
          className
        )}
        placeholder={placeholder || 'Write in Markdown…'}
        value={content}
        onChange={(e) => {
          const next = e.target.value
          contentRef.current = next
          model.updateFromText(next)
          setContent(next)
        }}
        onKeyDown={onKeyDown}
        onDragOver={(event) => {
          if (event.dataTransfer?.types.includes('Files')) {
            event.preventDefault()
          }
        }}
        onDrop={async (event) => {
          const files = event.dataTransfer?.files
          if (!files || files.length === 0) return
          const images = Array.from(files).filter((file) => file.type.startsWith('image/'))
          if (images.length === 0) return
          event.preventDefault()
          let selection = getSelection()
          for (const file of images) {
            selection = (await insertUploadedImage(file, selection)) ?? selection
          }
        }}
        aria-busy={uploadStatus === 'uploading'}
      />
      <CursorOverlay
        textareaRef={textareaRef}
        provider={collaborationProvider}
        model={model}
        mode={mode}
      />
      <SelectionOverlay
        textareaRef={textareaRef}
        provider={collaborationProvider}
        model={model}
        mode={mode}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      <Toolbar textareaRef={textareaRef} onAnnounce={setLiveMessage} />
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <CollaborationPresence />
          <SyncIndicator provider={collaborationProvider} status={collaborationStatus} className="mt-1" />
          <ConflictBanner provider={collaborationProvider} model={model} className="mt-2" />
        </div>
        <PresenceSidebar
          provider={collaborationProvider}
          model={model}
          onFollow={(clientId) => {
            const el = textareaRef.current
            const provider = collaborationProvider
            if (!el || !provider) return
            const state = provider.awareness.getStates().get(clientId) as any
            const sel = state?.selection as { blockId: string; range?: { start: number; end: number }; color?: string }
            if (!sel || !sel.range) return
            const block = model.getBlocks().find((b) => b.id === sel.blockId)
            if (!block) return
            const style = window.getComputedStyle(el)
            const offset = block.start + Math.min(sel.range.start, sel.range.end)
            const { row } = computeCursorCoords(model.getText(), offset, style, { current: null }, 8)
            const paddingTop = parseFloat(style.paddingTop) || 0
            const lineHeight = parseFloat(style.lineHeight) || 18
            const targetTop = Math.max(0, paddingTop + row * lineHeight - el.clientHeight * 0.3)
            el.scrollTo({ top: targetTop, behavior: 'smooth' })
            el.focus()
          }}
        />
      </div>
      {mode === 'write' ? (
        editorArea
      ) : (
        <PreviewBlocks
          model={model}
          {...(onCommentAction ? { onCommentAction } : {})}
          {...(onMentionAction ? { onMentionAction } : {})}
        />
      )}
      <div role="status" aria-live="polite" className="sr-only" data-testid="editor-live-region">
        {liveMessage}
      </div>
    </div>
  )
}

function CollaborationBootstrap({ config }: { config: CollaborationConfig }) {
  useCollaboration(config)
  return null
}

export function Editor(props: EditorProps) {
  const { children, collaboration, ...rest } = props
  return (
    <EditorProvider>
      {collaboration ? <CollaborationBootstrap config={collaboration} /> : null}
      <EditorInner {...rest} />
      {children}
    </EditorProvider>
  )
}

function CollaborationPresence() {
  const { collaborationProvider, collaborationStatus } = useEditor()
  const [peers, setPeers] = useState<Array<{ id: number; name: string; color?: string }>>([])

  useEffect(() => {
    const provider = collaborationProvider
    if (!provider) {
      setPeers([])
      return
    }
    const awareness = provider.awareness
    const update = () => {
      const states = awareness.getStates()
      const next: Array<{ id: number; name: string; color?: string }> = []
      states.forEach((state: unknown, clientId: number) => {
        if (clientId === provider.doc.clientID) return
        const presence = (state as any)?.presence as { displayName?: string; color?: string } | undefined
        const base = { id: clientId, name: presence?.displayName ?? `User ${clientId}` } as {
          id: number; name: string; color?: string
        }
        if (presence?.color) base.color = presence.color
        next.push(base)
      })
      setPeers(next)
    }

    awareness.on('update', update)
    update()

    return () => {
      awareness.off('update', update)
    }
  }, [collaborationProvider])

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1 rounded-full border px-2 py-0.5">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            collaborationStatus === 'connected' && 'bg-emerald-500',
            collaborationStatus === 'connecting' && 'bg-amber-400 animate-pulse',
            collaborationStatus === 'error' && 'bg-red-500',
            collaborationStatus === 'disconnected' && 'bg-muted-foreground'
          )}
        />
        {collaborationStatus}
      </span>
      {peers.length === 0 ? (
        <span className="text-muted-foreground">No collaborators present</span>
      ) : null}
      {peers.map((peer) => (
        <span
          key={peer.id}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
          style={{ borderColor: peer.color ?? 'var(--ring)' }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: peer.color ?? 'var(--ring)' }}
          />
          {peer.name}
        </span>
      ))}
    </div>
  )
}

type CursorOverlayProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  provider: CollaborationProvider | null
  model: EditorModel
  mode: 'write' | 'preview'
}

type CursorPosition = {
  id: number
  top: number
  left: number
  color?: string
  name: string
}

function CursorOverlay({ textareaRef, provider, model, mode }: CursorOverlayProps) {
  const [positions, setPositions] = useState<CursorPosition[]>([])
  const charWidthRef = useRef<number | null>(null)
  const lineHeightRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const computeMetrics = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const style = window.getComputedStyle(el)
    if (!lineHeightRef.current) {
      const lh = parseFloat(style.lineHeight)
      lineHeightRef.current = Number.isNaN(lh) ? parseFloat(style.fontSize) * 1.4 : lh
    }
    if (!charWidthRef.current) {
      const span = document.createElement('span')
      span.textContent = 'M'
      span.style.position = 'absolute'
      span.style.visibility = 'hidden'
      span.style.font = style.font
      document.body.appendChild(span)
      charWidthRef.current = span.getBoundingClientRect().width || 8
      document.body.removeChild(span)
    }
  }, [textareaRef])

  const updatePositions = useCallback(() => {
    const el = textareaRef.current
    if (!provider || !el || mode !== 'write') {
      setPositions([])
      return
    }
    computeMetrics()
    const text = model.getText()
    const style = window.getComputedStyle(el)
    const paddingTop = parseFloat(style.paddingTop) || 0
    const paddingLeft = parseFloat(style.paddingLeft) || 0
    const lineHeight = lineHeightRef.current ?? 18
    const charWidth = charWidthRef.current ?? 8
    const scrollTop = el.scrollTop
    const scrollLeft = el.scrollLeft
    const clientHeight = el.clientHeight

    const blocks = model.getBlocks()

    const next: CursorPosition[] = []
    provider.awareness.getStates().forEach((state: unknown, clientId: number) => {
      if (clientId === provider.doc.clientID) return
      const selection = (state as any)?.selection as
        | { blockId: string; range?: { start: number; end: number }; color?: string; displayName?: string }
        | undefined
      if (!selection || !selection.range) return
      const block = blocks.find((b) => b.id === selection.blockId)
      if (!block) return
      const offset = block.start + selection.range.start
      const { row, px } = computeCursorCoords(text, offset, style, canvasRef, charWidth)
      const top = paddingTop + row * lineHeight - scrollTop
      const left = paddingLeft + px - scrollLeft
      if (top < -lineHeight || top > clientHeight + lineHeight) return
      const base: CursorPosition = {
        id: clientId,
        top,
        left,
        name: (state as any)?.presence?.displayName ?? `User ${clientId}`,
      }
      const color = selection.color ?? (state as any)?.presence?.color
      if (color) base.color = color
      next.push(base)
    })
    setPositions(next)
  }, [computeMetrics, model, mode, provider, textareaRef])

  useEffect(() => {
    if (!provider) return
    const awareness = provider.awareness
    awareness.on('update', updatePositions)
    provider.doc.on('update', updatePositions)
    updatePositions()
    return () => {
      awareness.off('update', updatePositions)
      provider.doc.off('update', updatePositions)
    }
  }, [provider, updatePositions])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const handler = () => updatePositions()
    el.addEventListener('scroll', handler)
    window.addEventListener('resize', handler)
    return () => {
      el.removeEventListener('scroll', handler)
      window.removeEventListener('resize', handler)
    }
  }, [textareaRef, updatePositions])

  useEffect(() => {
    const unsubscribe = model.subscribe(updatePositions)
    return () => unsubscribe()
  }, [model, updatePositions])

  useEffect(() => {
    updatePositions()
  }, [mode, updatePositions])

  if (!provider || mode !== 'write') return null
  return (
    <div className="pointer-events-none absolute inset-0">
      {positions.map((cursor) => (
        <div
          key={cursor.id}
          className="absolute flex items-center gap-1 transition-transform duration-150"
          style={{ top: cursor.top, left: cursor.left, transform: 'translate(-50%, -50%)' }}
        >
          <div
            className="h-5 w-1 rounded-full"
            style={{ backgroundColor: cursor.color ?? '#22c55e' }}
          />
          <span
            className="pointer-events-auto select-none rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow"
            style={{ border: `1px solid ${cursor.color ?? '#22c55e'}` }}
          >
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  )
}

function computeRowCol(text: string, index: number): { row: number; col: number } {
  let row = 0
  let col = 0
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') {
      row += 1
      col = 0
    } else {
      col += 1
    }
  }
  return { row, col }
}

function computeCursorCoords(
  text: string,
  index: number,
  style: CSSStyleDeclaration,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  fallbackCharWidth: number
): { row: number; px: number } {
  const { row, col } = computeRowCol(text, index)
  if (typeof window === 'undefined') {
    return { row, px: col * fallbackCharWidth }
  }
  if (!canvasRef.current) {
    canvasRef.current = document.createElement('canvas')
  }
  const ctx = canvasRef.current.getContext('2d')
  if (!ctx) {
    return { row, px: col * fallbackCharWidth }
  }
  ctx.font = style.font || `${style.fontSize} ${style.fontFamily}`
  const lineStart = text.lastIndexOf('\n', index - 1) + 1
  const lineText = text.slice(lineStart, index).replace(/\t/g, '    ')
  const metrics = ctx.measureText(lineText)
  return { row, px: metrics.width }
}
