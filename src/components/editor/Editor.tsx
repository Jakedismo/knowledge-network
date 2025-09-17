"use client"
import React, { useEffect, useMemo, useRef } from 'react'
import { EditorProvider, useEditor } from './EditorProvider'
import { useEditorStore } from './state'
import { Toolbar } from './Toolbar'
import { Preview } from './Preview'
import { cn } from '@/lib/utils'

type EditorProps = {
  className?: string
  placeholder?: string
  autoFocus?: boolean
}

function EditorInner({ className, placeholder, autoFocus }: EditorProps) {
  const { api } = useEditor()
  const content = useEditorStore((s) => s.content)
  const mode = useEditorStore((s) => s.mode)
  const setContent = useEditorStore((s) => s.setContent)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      // simple bold
      const el = textareaRef.current!
      const start = el.selectionStart
      const end = el.selectionEnd
      const before = content.slice(0, start)
      const sel = content.slice(start, end)
      const after = content.slice(end)
      const next = `${before}**${sel}**${after}`
      setContent(next)
      requestAnimationFrame(() => el.setSelectionRange(start + 2, end + 2))
    }
  }

  // keep provider API insertAtCursor working with our ref
  useEffect(() => {
    // not exposing ref globally; API methods already target current ref via provider
    // no-op here
  }, [])

  const editorArea = (
    <textarea
      ref={textareaRef}
      aria-label="Markdown editor"
      className={cn(
        'min-h-[200px] w-full resize-y rounded-md border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring',
        className
      )}
      placeholder={placeholder || 'Write in Markdown…'}
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onKeyDown={onKeyDown}
      onDrop={(e) => {
        e.preventDefault()
        const files = e.dataTransfer?.files
        if (!files || files.length === 0) return
        for (const f of Array.from(files)) {
          if (f.type.startsWith('image/')) {
            const url = URL.createObjectURL(f)
            const el = textareaRef.current!
            const start = el.selectionStart ?? content.length
            const end = el.selectionEnd ?? content.length
            const before = content.slice(0, start)
            const after = content.slice(end)
            const md = `![${f.name}](${url})\n`
            const next = `${before}${md}${after}`
            setContent(next)
          }
        }
      }}
    />
  )

  return (
    <div className="flex flex-col gap-2">
      <Toolbar textareaRef={textareaRef} />
      {mode === 'write' ? editorArea : <Preview markdown={content} />}
    </div>
  )
}

export function Editor(props: EditorProps) {
  return (
    <EditorProvider>
      <EditorInner {...props} />
    </EditorProvider>
  )
}
