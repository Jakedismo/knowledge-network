"use client"
import * as React from 'react'
import type { ID, MovePosition, TreeMoveEvent, TreeNode } from './types'
import { cn } from '@/lib/utils'

export interface TreeViewProps {
  nodes: TreeNode[]
  onToggle?: (id: ID, expanded: boolean) => void
  onSelect?: (id: ID) => void
  onMove?: (e: TreeMoveEvent) => void
  className?: string
  // Optional aria-label for screen readers
  ariaLabel?: string
}

type FlatNode = TreeNode & { depth: number; parentId: ID | null; index: number; path: ID[] }

function flatten(nodes: TreeNode[], depth = 0, parentId: ID | null = null, path: ID[] = []): FlatNode[] {
  const list: FlatNode[] = []
  nodes.forEach((n, idx) => {
    const ch = (n as any).children ?? []
    const flat: FlatNode = { ...(n as any), children: ch, depth, parentId, index: idx, path: [...path, n.id] }
    list.push(flat)
    if (n.isExpanded && ch.length) {
      list.push(...flatten(ch, depth + 1, n.id, flat.path))
    }
  })
  return list
}

export function TreeView({ nodes, onToggle, onSelect, onMove, className, ariaLabel = 'Folder tree' }: TreeViewProps) {
  const flat = React.useMemo(() => flatten(nodes), [nodes])
  const [activeId, setActiveId] = React.useState<ID | null>(flat.find(n => n.isSelected)?.id ?? null)

  React.useEffect(() => {
    const selected = flat.find(n => n.isSelected)
    setActiveId(selected?.id ?? null)
  }, [flat])

  function getIndex(id: ID | null) {
    return id ? flat.findIndex(n => n.id === id) : -1
  }

  function moveFocus(next: number) {
    const clamped = Math.max(0, Math.min(next, flat.length - 1))
    const id = flat[clamped]?.id
    setActiveId(id)
    onSelect?.(id)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const idx = getIndex(activeId)
    if (idx < 0) return
    const item = flat[idx]
    if (e.key === 'ArrowDown') {
      e.preventDefault(); moveFocus(idx + 1)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault(); moveFocus(idx - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (item && item.children.length && !item.isExpanded) onToggle?.(item.id, true)
      else moveFocus(idx + 1)
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (item && item.children.length && item.isExpanded) onToggle?.(item.id, false)
      else if (item && item.parentId) onSelect?.(item.parentId)
    }
  }

  function onDragStart(e: React.DragEvent, id: ID) {
    e.dataTransfer.setData('text/tree-id', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('text/tree-id')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  function onDrop(e: React.DragEvent, targetId: ID, position: MovePosition) {
    const sourceId = e.dataTransfer.getData('text/tree-id')
    if (!sourceId || sourceId === targetId) return
    onMove?.({ sourceId, targetId, position })
  }

  return (
    <div
      className={cn('select-none', className)}
      role="tree"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {flat.map((n) => (
        <div
          key={n.id}
          role="treeitem"
          aria-level={n.depth + 1}
          aria-expanded={n.children?.length ? !!n.isExpanded : undefined}
          aria-selected={n.isSelected}
          className={cn(
            'flex items-center gap-1 py-1 pr-2 rounded cursor-default',
            n.isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          )}
          style={{ paddingLeft: (n.depth * 16) + 8 }}
          draggable
          onDragStart={(e) => onDragStart(e, n.id)}
          onDragOver={onDragOver}
        >
          {(n.children ?? []).length ? (
            <button
              type="button"
              aria-label={n.isExpanded ? 'Collapse' : 'Expand'}
              className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-muted"
              onClick={() => onToggle?.(n.id, !n.isExpanded)}
            >
              <span aria-hidden>{n.isExpanded ? '▾' : '▸'}</span>
            </button>
          ) : (
            <span className="w-5" />
          )}
          <div
            role="button"
            tabIndex={-1}
            className="min-w-0 flex-1 truncate"
            onClick={() => onSelect?.(n.id)}
            onDrop={(e) => onDrop(e, n.id, 'inside')}
          >
            {n.name}
          </div>
          {/* drop zones for before/after */}
          <div
            className="w-2 h-5"
            aria-hidden
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, n.id, 'before')}
          />
          <div
            className="w-2 h-5"
            aria-hidden
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, n.id, 'after')}
          />
        </div>
      ))}
      <p className="sr-only" aria-live="polite">Use arrow keys to navigate. Use mouse or touch to drag items.</p>
    </div>
  )
}
