import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'
import { PresenceSidebar } from '@/components/collab/PresenceSidebar'
import { SyncIndicator } from '@/components/collab/SyncIndicator'
import { ConflictBanner } from '@/components/collab/ConflictBanner'
import { EditorProvider, useEditor } from '@/components/editor/EditorProvider'
import { Editor } from '@/components/editor/Editor'

const meta = {
  title: 'Collaboration/RealtimeUI',
  component: PresenceSidebar,
} satisfies Meta<typeof PresenceSidebar>

export default meta
type Story = StoryObj<typeof PresenceSidebar>

class MockProvider implements CollaborationProvider {
  roomId: string
  doc: Y.Doc
  awareness: Awareness
  transport: 'broadcast' | 'websocket' = 'broadcast'
  constructor(roomId: string) {
    this.roomId = roomId
    this.doc = new Y.Doc()
    this.awareness = new Awareness(this.doc)
  }
  destroy(): void {
    this.awareness.destroy()
    this.doc.destroy()
  }
}

function DemoShell() {
  const [provider] = useState(() => new MockProvider('room-demo'))
  const { setCollaborationProvider, setCollaborationStatus, model } = useEditor()

  useEffect(() => {
    setCollaborationProvider?.(provider)
    setCollaborationStatus?.('connected')
    provider.awareness.setLocalState({ presence: { userId: 'u-local', displayName: 'You', color: '#22c55e' } })
    // seed two peers
    ;(provider.awareness as any).states.set(1, { presence: { userId: 'u1', displayName: 'Alex', color: '#6366f1', typing: true }, selection: { blockId: 'block-0-0', range: { start: 2, end: 12 } } })
    ;(provider.awareness as any).states.set(2, { presence: { userId: 'u2', displayName: 'Sam', color: '#f59e0b' }, selection: { blockId: 'block-0-0', range: { start: 8, end: 20 } } })
    provider.awareness.emit('update', { added: [], updated: [], removed: [] })
    return () => setCollaborationProvider?.(null)
  }, [provider, setCollaborationProvider, setCollaborationStatus])

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <SyncIndicator provider={provider} status={'connected'} />
        <ConflictBanner provider={provider} model={model} className="mt-2" />
        <Editor placeholder="Type here…" autoFocus collaboration={{ roomId: 'room-demo', presence: { userId: 'u-local', displayName: 'You', color: '#22c55e' }, transport: 'broadcast' }} />
      </div>
      <PresenceSidebar provider={provider} model={model} />
    </div>
  )
}

export const Default: Story = {
  render: () => (
    <EditorProvider>
      <DemoShell />
    </EditorProvider>
  ),
}

