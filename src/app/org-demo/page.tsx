"use client"
import React, { useState } from 'react'
import { FolderTree } from '@/components/org/FolderTree'
import type { CollectionNode } from '@/lib/org/types'
import { Button } from '@/components/ui/button'

function sampleTree(): CollectionNode[] {
  const now = new Date()
  return [
    {
      id: 'col_root_1',
      name: 'Engineering',
      description: 'All eng topics',
      color: undefined,
      icon: undefined,
      sortOrder: 0,
      workspaceId: 'ws_demo',
      parentId: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      children: [
        {
          id: 'col_fe',
          name: 'Frontend',
          description: undefined,
          color: undefined,
          icon: undefined,
          sortOrder: 0,
          workspaceId: 'ws_demo',
          parentId: 'col_root_1',
          metadata: {},
          createdAt: now,
          updatedAt: now,
          children: [],
        },
        {
          id: 'col_be',
          name: 'Backend',
          description: undefined,
          color: undefined,
          icon: undefined,
          sortOrder: 1,
          workspaceId: 'ws_demo',
          parentId: 'col_root_1',
          metadata: {},
          createdAt: now,
          updatedAt: now,
          children: [],
        },
      ],
    },
    {
      id: 'col_root_2',
      name: 'Product',
      description: undefined,
      color: undefined,
      icon: undefined,
      sortOrder: 1,
      workspaceId: 'ws_demo',
      parentId: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      children: [],
    },
  ]
}

export default function OrgDemoPage() {
  const [tree, setTree] = useState<CollectionNode[]>(sampleTree())

  const move = (id: string, newParentId: string | null) => {
    // client-only demo: detach and reattach
    function detach(list: CollectionNode[]): CollectionNode | null {
      for (let i = 0; i < list.length; i++) {
        const n = list[i]
        if (n.id === id) {
          list.splice(i, 1)
          return n
        }
        const r = detach(n.children)
        if (r) return r
      }
      return null
    }
    function find(list: CollectionNode[], nid: string): CollectionNode | null {
      for (const n of list) {
        if (n.id === nid) return n
        const r = find(n.children, nid)
        if (r) return r
      }
      return null
    }
    setTree((roots) => {
      const clone: CollectionNode[] = JSON.parse(JSON.stringify(roots))
      const node = detach(clone)
      if (!node) return clone
      node.parentId = newParentId
      if (!newParentId) clone.push(node)
      else {
        const parent = find(clone, newParentId)
        if (parent) parent.children.push(node)
      }
      return clone
    })
  }

  const reorder = (id: string, newIndex: number) => {
    setTree((roots) => {
      const clone: CollectionNode[] = JSON.parse(JSON.stringify(roots))
      function apply(list: CollectionNode[]): boolean {
        for (const n of list) {
          if (n.children.some((c) => c.id === id)) {
            const curIdx = n.children.findIndex((c: CollectionNode) => c.id === id)
            const [item] = n.children.splice(curIdx, 1)
            n.children.splice(newIndex, 0, item)
            n.children.forEach((c: CollectionNode, i: number) => (c.sortOrder = i))
            return true
          }
          if (apply(n.children)) return true
        }
        return false
      }
      // try roots
      if (clone.some((c: CollectionNode) => c.id === id)) {
        const curIdx = clone.findIndex((c: CollectionNode) => c.id === id)
        const [item] = clone.splice(curIdx, 1)
        clone.splice(newIndex, 0, item)
        clone.forEach((c: CollectionNode, i: number) => (c.sortOrder = i))
        return clone
      }
      apply(clone)
      return clone
    })
  }

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Organization Demo</h1>
        <p className="text-sm text-muted-foreground">Drag folders to move; ArrowUp/Down to reorder.</p>
      </header>
      <div className="rounded border p-4">
        <FolderTree tree={tree} onMove={move} onReorder={reorder} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => setTree(sampleTree())}>Reset</Button>
      </div>
    </main>
  )
}
