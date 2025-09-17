"use client"
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CommentModel, CommentStatus, CommentPositionData } from '@/types/comments'
import { commentApi } from '@/lib/comments/api'
import apolloClient from '@/lib/graphql/client'
import { GET_KNOWLEDGE } from '@/lib/graphql/queries'
import { COMMENT_ADDED } from '@/lib/graphql/subscriptions'
import { CommentComposer } from './CommentComposer'
import { CommentThread } from './CommentThread'

type Props = {
  knowledgeId: string
  workspaceId?: string | null
}

type Filter = 'all' | 'open' | 'resolved'

function useAnchors(): { anchors: CommentPositionData[]; refresh: () => void } {
  const [anchors, setAnchors] = useState<CommentPositionData[]>([])
  const scan = useCallback(() => {
    if (typeof document === 'undefined') return
    const found: CommentPositionData[] = []
    const headings = document.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')
    headings.forEach((el) => {
      const id = el.getAttribute('id') || undefined
      if (id) found.push({ headingId: id, headingText: (el as HTMLElement).innerText })
    })
    // Also consider editor blocks
    const blocks = document.querySelectorAll('[data-block-id]')
    blocks.forEach((el) => {
      const id = el.getAttribute('data-block-id') || undefined
      if (id) found.push({ blockId: id })
    })
    setAnchors(found)
  }, [])
  useEffect(() => {
    const t = setTimeout(scan, 0)
    return () => clearTimeout(t)
  }, [scan])
  return { anchors, refresh: scan }
}

export function CommentsPanel({ knowledgeId, workspaceId = null }: Props) {
  const [threads, setThreads] = useState<CommentModel[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [anchor, setAnchor] = useState<CommentPositionData | null>(null)
  const [loading, setLoading] = useState(false)
  const { anchors, refresh } = useAnchors()

  const reload = async () => {
    setLoading(true)
    try {
      const data = await commentApi.list(knowledgeId)
      setThreads(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [knowledgeId])

  // Live updates: try GraphQL subscription; fallback to polling every 10s
  useEffect(() => {
    let unsub: (() => void) | null = null
    try {
      // @ts-expect-error Apollo link may not support subscriptions locally; catch failures
      const obs = apolloClient.subscribe({ query: COMMENT_ADDED, variables: { knowledgeId } })
      const sub = obs.subscribe({ next: () => reload(), error: () => {} })
      unsub = () => sub.unsubscribe()
    } catch {
      // ignore
    }
    const iv = window.setInterval(() => reload(), 10000)
    return () => {
      if (unsub) unsub()
      window.clearInterval(iv)
    }
  }, [knowledgeId])

  const shown = useMemo(() => {
    if (filter === 'all') return threads
    return threads.filter((t) => t.status === filter)
  }, [threads, filter])

  return (
    <aside className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Comments</h3>
        <div className="flex items-center gap-1 text-xs">
          <label htmlFor="filter">Filter</label>
          <select id="filter" className="rounded border bg-background p-1 text-xs" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select className="w-full rounded border bg-background p-1 text-xs" value={JSON.stringify(anchor ?? null)} onChange={(e) => setAnchor(JSON.parse(e.target.value))}>
            <option value={JSON.stringify(null)}>Anchor: none</option>
            {anchors.map((a, idx) => (
              <option key={idx} value={JSON.stringify(a)}>
                {a.headingText ? `# ${a.headingText}` : a.headingId ? `#${a.headingId}` : a.blockId ? `Block ${a.blockId.slice(0, 6)}` : 'Unknown'}
              </option>
            ))}
          </select>
          <button type="button" className="rounded px-2 py-1 text-xs ring-1 ring-border hover:bg-accent" onClick={refresh}>
            Rescan
          </button>
        </div>
        <CommentComposer knowledgeId={knowledgeId} anchor={anchor} workspaceId={workspaceId} onCreated={reload} />
      </div>
      <div className="mt-2 flex-1 space-y-2 overflow-auto">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : shown.length === 0 ? (
          <div className="text-sm text-muted-foreground">No comments</div>
        ) : (
          shown.map((t) => <CommentThread key={t.id} thread={t} onChanged={reload} />)
        )}
      </div>
    </aside>
  )
}
