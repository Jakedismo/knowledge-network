"use client"
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { commentApi, userSuggest } from '@/lib/comments/api'
import type { CommentMention, CommentPositionData, CreateCommentInput } from '@/types/comments'

type Props = {
  knowledgeId: string
  parentId?: string | null
  anchor?: CommentPositionData | null
  workspaceId?: string | null
  onCreated?: () => void
  className?: string
}

export function CommentComposer({ knowledgeId, parentId, anchor = null, workspaceId = null, onCreated, className }: Props) {
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<CommentMention[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; displayName: string; avatarUrl?: string }[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // Debounce mention suggestions
  useEffect(() => {
    let active = true
    const run = async () => {
      if (!showSuggest || query.trim().length === 0) return
      try {
        const data = await userSuggest.search(query, workspaceId ?? undefined)
        if (active) setSuggestions(data)
      } catch {
        // ignore
      }
    }
    const t = setTimeout(run, 120)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query, showSuggest])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setValue(text)
    const caret = e.target.selectionStart ?? text.length
    // naive: find last '@' without space after
    const at = text.lastIndexOf('@', caret - 1)
    if (at >= 0) {
      const tail = text.slice(at + 1, caret)
      if (!tail.includes(' ') && tail.length >= 0) {
        setQuery(tail)
        setShowSuggest(true)
      } else {
        setShowSuggest(false)
      }
    } else {
      setShowSuggest(false)
    }
  }

  const insertMention = (u: { id: string; displayName: string }) => {
    const el = taRef.current
    if (!el) return
    const caret = el.selectionStart ?? value.length
    // find the preceding '@'
    const at = value.lastIndexOf('@', caret - 1)
    if (at < 0) return
    const label = `@${u.displayName}`
    const before = value.slice(0, at)
    const after = value.slice(caret)
    const next = `${before}${label}${after}`
    setValue(next)
    // record mention positions relative to new text (start at before.length)
    setMentions((prev) => [...prev, { userId: u.id, displayName: u.displayName, start: before.length, length: label.length }])
    const pos = (before + label).length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
    setShowSuggest(false)
  }

  const canSubmit = value.trim().length > 0 && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const payload: CreateCommentInput = { knowledgeId, parentId: parentId ?? null, content: value.trim(), mentions, positionData: anchor ?? null }
      await commentApi.create(payload)
      setValue('')
      setMentions([])
      onCreated?.()
    } catch (e: any) {
      setError(e?.message || 'Failed to post')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('rounded-md border p-2', className)}>
      <textarea
        ref={taRef}
        className="min-h-[64px] w-full resize-y rounded border bg-background p-2 text-sm outline-none"
        placeholder={parentId ? 'Reply…' : 'Add a comment… Use @ to mention'}
        value={value}
        onChange={onChange}
      />
      {showSuggest && suggestions.length > 0 && (
        <div className="z-10 mt-1 max-h-48 w-full overflow-auto rounded border bg-popover p-1 text-sm shadow">
          {suggestions.map((u) => (
            <button key={u.id} type="button" className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-accent" onClick={() => insertMention(u)}>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">@</span>
              <span>{u.displayName}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50" disabled={!canSubmit} onClick={submit}>
          {busy ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  )}
