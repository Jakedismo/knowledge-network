"use client"
import React, { useCallback, useMemo, useState } from 'react'
import type { CollectionNode } from '@/lib/org/types'
import { cn } from '@/lib/cn'

export type FolderTreeProps = {
  tree: CollectionNode[]
  onMove?: (id: string, newParentId: string | null) => void
  onReorder?: (id: string, newIndex: number) => void
}

type DragData = { id: string; parentId: string | null }

export function FolderTree({ tree, onMove, onReorder }: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNode = useCallback(
    (node: CollectionNode, depth: number, index: number, siblings: CollectionNode[]) => {
      const isExpanded = expanded.has(node.id)
      const hasChildren = node.children.length > 0

      const onDragStart = (e: React.DragEvent) => {
        const data: DragData = { id: node.id, parentId: node.parentId }
        e.dataTransfer.setData('application/json', JSON.stringify(data))
        e.dataTransfer.effectAllowed = 'move'
      }
      const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }
      const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        try {
          const raw = e.dataTransfer.getData('application/json')
          const data = JSON.parse(raw) as DragData
          if (data.id === node.id) return
          onMove?.(data.id, node.id)
        } catch {}
      }

      const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') toggle(node.id)
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && onReorder) {
          e.preventDefault()
          const dir = e.key === 'ArrowUp' ? -1 : 1
          const newIdx = Math.max(0, Math.min(siblings.length - 1, index + dir))
          onReorder(node.id, newIdx)
        }
      }

      return (
        <div key={node.id} className="select-none" role="treeitem" aria-expanded={isExpanded}>
          <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1 outline-none',
              'hover:bg-muted focus:ring-2 focus:ring-ring',
            )}
            style={{ paddingLeft: depth * 16 }}
            aria-label={node.name}
          >
            <button
              className="w-5 text-muted-foreground"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={() => toggle(node.id)}
            >
              {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
            </button>
            <span className="truncate">{node.name}</span>
          </div>
          {hasChildren && isExpanded && (
            <div role="group">
          {node.children
                .slice()
                .sort((a: CollectionNode, b: CollectionNode) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                .map((c: CollectionNode, i: number, arr: CollectionNode[]) => renderNode(c, depth + 1, i, arr))}
            </div>
          )}
        </div>
      )
    },
    [expanded, onMove, onReorder],
  )

  const sortedRoots = useMemo(
    () => tree.slice().sort((a: CollectionNode, b: CollectionNode) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [tree],
  )

  return (
    <div role="tree" aria-label="Collections">
      {sortedRoots.map((n, i, arr) => renderNode(n, 0, i, arr))}
    </div>
  )
}

export default FolderTree
