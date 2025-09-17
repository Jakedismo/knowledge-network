"use client"
import React, { useEffect, useMemo, useState } from 'react'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'
import type { EditorModel } from '@/lib/editor/model'
import type { AwarenessState } from '@/lib/collab/types'
import { cn } from '@/lib/utils'

export type PresenceSidebarProps = {
  provider: CollaborationProvider | null
  model: EditorModel
  className?: string
  onFollow?: (clientId: number) => void
}

type PeerEntry = {
  id: number
  name: string
  color?: string
  typing?: boolean
  blockLabel?: string
}

export function PresenceSidebar({ provider, model, className, onFollow }: PresenceSidebarProps) {
  const [peers, setPeers] = useState<PeerEntry[]>([])

  const blocks = useMemo(() => model.getBlocks(), [model])

  useEffect(() => {
    if (!provider) {
      setPeers([])
      return
    }
    const awareness = provider.awareness
    const update = () => {
      const next: PeerEntry[] = []
      awareness.getStates().forEach((state: unknown, clientId: number) => {
        if (clientId === provider.doc.clientID) return
        const s = state as AwarenessState
        const name = s.presence?.displayName ?? `User ${clientId}`
        const color = s.presence?.color
        const typing = !!s.presence?.typing
        let blockLabel: string | undefined
        const blockId = s.selection?.blockId
        if (blockId) {
          const block = blocks.find((b) => b.id === blockId)
          if (block) {
            const text = block.text.trim()
            blockLabel = text.length > 0 ? truncate(text, 48) : '(empty paragraph)'
          }
        }
        const base: PeerEntry = { id: clientId, name, typing }
        if (color) base.color = color
        if (blockLabel) base.blockLabel = blockLabel
        next.push(base)
      })
      setPeers(next)
    }
    awareness.on('update', update)
    update()
    return () => awareness.off('update', update)
  }, [blocks, provider])

  if (!provider) return null

  return (
    <aside
      aria-label="Collaborators"
      className={cn(
        'w-60 shrink-0 rounded-md border bg-card p-3 text-sm text-card-foreground',
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium">Collaborators</div>
        <span className="text-xs text-muted-foreground">{peers.length}</span>
      </div>
      {peers.length === 0 ? (
        <div className="text-xs text-muted-foreground">No one else is here.</div>
      ) : (
        <ul className="space-y-2">
          {peers.map((p) => (
            <li key={p.id} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.color ?? 'var(--ring)' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate" title={p.name}>{p.name}</span>
                  {p.typing ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TypingDots /> typing
                    </span>
                  ) : null}
                </div>
                {p.blockLabel ? (
                  <div className="truncate text-xs text-muted-foreground" title={p.blockLabel}>
                    editing: {p.blockLabel}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded border px-2 py-0.5 text-[11px] hover:bg-accent"
                onClick={() => onFollow?.(p.id)}
                aria-label={`Follow ${p.name}`}
              >
                Follow
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

function TypingDots() {
  return (
    <span aria-hidden className="inline-flex h-3 items-end gap-0.5 align-baseline">
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-200ms]" />
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-100ms]" />
      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-muted-foreground" />
    </span>
  )
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
