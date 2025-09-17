"use client"
import React, { useEffect, useMemo, useState } from 'react'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'
import type { EditorModel } from '@/lib/editor/model'
import type { AwarenessState } from '@/lib/collab/types'

export type ConflictBannerProps = {
  provider: CollaborationProvider | null
  model: EditorModel
  className?: string
}

type Conflict = {
  clientId: number
  name: string
  color?: string
  blockId: string
}

export function ConflictBanner({ provider, model, className }: ConflictBannerProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const blocks = useMemo(() => model.getBlocks(), [model])

  useEffect(() => {
    if (!provider) {
      setConflicts([])
      return
    }
    const awareness = provider.awareness
    const activeEl = (typeof document !== 'undefined') ? document.activeElement : null
    const el = activeEl && activeEl.tagName === 'TEXTAREA' ? (activeEl as HTMLTextAreaElement) : null
    const getLocalSelection = () => {
      if (!el || el.tagName !== 'TEXTAREA') return null
      const start = el.selectionStart ?? 0
      const end = el.selectionEnd ?? start
      const block = blocks.find((b) => start >= b.start && start <= b.end)
      if (!block) return null
      return { blockId: block.id, range: { start: Math.max(0, start - block.start), end: Math.max(0, end - block.start) } }
    }

    const detect = () => {
      const local = getLocalSelection()
      if (!local || local.range.start === local.range.end) { setConflicts([]); return }
      const next: Conflict[] = []
      awareness.getStates().forEach((state: unknown, clientId: number) => {
        if (clientId === provider.doc.clientID) return
        const s = state as AwarenessState
        if (!s.selection || s.selection.blockId !== local.blockId || !s.selection.range) return
        const r = s.selection.range
        if (rangesOverlap(local.range, r)) {
          const base: Conflict = { clientId, name: s.presence?.displayName ?? `User ${clientId}`, blockId: local.blockId }
          if (s.presence?.color) (base as any).color = s.presence.color
          next.push(base)
        }
      })
      setConflicts(next)
    }

    awareness.on('update', detect)
    detect()
    return () => awareness.off('update', detect)
  }, [blocks, model, provider])

  if (!provider || conflicts.length === 0) return null

  return (
    <div className={className}>
      <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
        <div>
          <strong className="mr-1">Potential conflict:</strong>
          {conflicts.length === 1 ? (
            <span>{conflicts[0].name} is editing the same selection.</span>
          ) : (
            <span>{conflicts.length} collaborators are editing the same selection.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded border px-2 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/50" aria-label="Keep my changes">
            Keep mine
          </button>
          <button type="button" className="rounded border px-2 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/50" aria-label="Review">
            Review
          </button>
        </div>
      </div>
    </div>
  )
}

function rangesOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  const s1 = Math.min(a.start, a.end)
  const e1 = Math.max(a.start, a.end)
  const s2 = Math.min(b.start, b.end)
  const e2 = Math.max(b.start, b.end)
  return s1 < e2 && s2 < e1
}

export { rangesOverlap }
