"use client"
import * as React from 'react'
import { useEffect, useState } from 'react'
import type { CommentModel, CommentStatus } from '@/types/comments'
import { commentApi } from '@/lib/comments/api'
import { cn } from '@/lib/cn'
import { CommentComposer } from './CommentComposer'

type Props = {
  thread: CommentModel
  onChanged?: () => void
}

export function CommentThread({ thread, onChanged }: Props) {
  const [openReply, setOpenReply] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(thread.content)
  const [status, setStatus] = useState<CommentStatus>(thread.status)

  useEffect(() => {
    setText(thread.content)
    setStatus(thread.status)
  }, [thread.content, thread.status])

  const saveEdit = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      await commentApi.update(thread.id, { content: text.trim() })
      setEditing(false)
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async (next: CommentStatus) => {
    setBusy(true)
    try {
      await commentApi.update(thread.id, { status: next })
      setStatus(next)
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this thread?')) return
    setBusy(true)
    try {
      await commentApi.remove(thread.id)
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('rounded-md border p-3', status === 'resolved' && 'opacity-80')}
         data-anchor-block-id={thread.positionData?.blockId}
         data-anchor-heading-id={thread.positionData?.headingId}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm">
          <div className="mb-1 text-xs text-muted-foreground">
            {new Date(thread.createdAt).toLocaleString()} {status !== 'open' && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{status}</span>}
          </div>
          {!editing ? <p className="whitespace-pre-wrap">{thread.content}</p> : (
            <textarea className="mt-1 w-full resize-y rounded border bg-background p-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
          )}
          {thread.replies && thread.replies.length > 0 && (
            <div className="mt-3 space-y-2 border-t pt-2">
              {thread.replies.map((r) => (
                <div key={r.id} className="rounded border p-2 text-sm">
                  <div className="mb-1 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                  <div className="whitespace-pre-wrap">{r.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {!editing ? (
            <>
              <button className="rounded px-2 py-1 text-xs ring-1 ring-border hover:bg-accent" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="rounded px-2 py-1 text-xs ring-1 ring-border hover:bg-accent" onClick={() => setOpenReply((v) => !v)}>
                Reply
              </button>
              {status !== 'resolved' ? (
                <button className="rounded px-2 py-1 text-xs ring-1 ring-border hover:bg-accent" onClick={() => changeStatus('resolved')}>
                  Resolve
                </button>
              ) : (
                <button className="rounded px-2 py-1 text-xs ring-1 ring-border hover:bg-accent" onClick={() => changeStatus('open')}>
                  Reopen
                </button>
              )}
              <button className="rounded px-2 py-1 text-xs text-destructive ring-1 ring-border hover:bg-accent" onClick={remove}>
                Delete
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground" onClick={saveEdit} disabled={busy}>
                Save
              </button>
              <button className="rounded px-2 py-1 text-xs ring-1 ring-border hover:bg-accent" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      {openReply && (
      <div className="mt-3">
          <CommentComposer knowledgeId={thread.knowledgeId} parentId={thread.id} onCreated={() => { setOpenReply(false); onChanged?.() }} />
        </div>
      )}
    </div>
  )
}
