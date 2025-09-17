import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Editor } from '../components/editor'
import { useEditorStore } from '../components/editor/state'
import { useEditor } from '../components/editor/EditorProvider'
import { useCollaboration, type PresenceState } from '../components/editor/hooks/use-collaboration'
import type { WebSocketLike } from '../lib/editor/collaboration/websocket-provider'
import * as Y from 'yjs'

class MockSocket extends EventTarget implements WebSocketLike {
  static channels = new Map<string, Set<MockSocket>>()
  readyState = 1
  constructor(private channel: string) {
    super()
    const set = MockSocket.channels.get(channel) ?? new Set<MockSocket>()
    set.add(this)
    MockSocket.channels.set(channel, set)
    setTimeout(() => this.dispatchEvent(new Event('open')), 0)
  }
  send(data: string) {
    const peers = MockSocket.channels.get(this.channel)
    if (!peers) return
    peers.forEach((peer) => {
      if (peer === this) return
      peer.dispatchEvent(new MessageEvent('message', { data }))
    })
  }
  close() {
    const peers = MockSocket.channels.get(this.channel)
    if (peers) {
      peers.delete(this)
    }
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }
}

const mockSocketFactory = (url: string): WebSocketLike => {
  const parsed = new URL(url, 'https://mock')
  const channel = parsed.pathname.replace(/\//g, '-')
  return new MockSocket(channel)
}

const meta: Meta<typeof Editor> = {
  title: 'Editor/Performance',
  component: Editor,
}

export default meta
type Story = StoryObj<typeof Editor>

const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent fermentum libero sit amet orci ultrices, vitae bibendum libero interdum. Sed tempor accumsan mi, sed iaculis mauris pharetra nec.`

function buildLargeDocument(sections = 150): string {
  return Array.from({ length: sections })
    .map((_, i) => `## Section ${i + 1}\n\n${lorem}\n\n${lorem}\n\n- Bullet point A\n- Bullet point B\n\n`)
    .join('\n')
}

const largeDoc = buildLargeDocument()

const MetricsPanel: React.FC = () => {
  const { model } = useEditor()
  const snapshot = useSyncExternalStore(
    (listener) => model.subscribe(listener),
    () => model.getSnapshot(),
    () => model.getSnapshot()
  )

  const blockCount = snapshot.blocks.length
  const approxVirtualized = blockCount > 80 || snapshot.text.length > 20_000

  return (
    <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
      <div><strong>Blocks</strong>: {blockCount}</div>
      <div><strong>Characters</strong>: {snapshot.text.length.toLocaleString()}</div>
      <div><strong>Virtualization Active</strong>: {approxVirtualized ? 'Yes' : 'No'}</div>
      <div><strong>Decorated Blocks</strong>: {Object.keys(snapshot.decorations).length}</div>
    </div>
  )
}

const DecorationSeed: React.FC = () => {
  const { model } = useEditor()
  const seededRef = useRef(false)
  const snapshot = useSyncExternalStore(
    (listener) => model.subscribe(listener),
    () => model.getSnapshot(),
    () => model.getSnapshot()
  )

  useEffect(() => {
    if (seededRef.current) return
    if (snapshot.blocks.length < 6) return
    seededRef.current = true
    const comment = {
      id: 'comment-1',
      blockId: snapshot.blocks[2].id,
      type: 'comment',
      range: { start: 0, end: 30 },
      data: { author: 'Alex', count: 2 },
    }
    const mention = {
      id: 'mention-1',
      blockId: snapshot.blocks[5].id,
      type: 'mention',
      range: { start: 10, end: 22 },
      data: { user: '@jamie' },
    }
    model.addBlockDecoration(comment)
    model.addBlockDecoration(mention)
  }, [model, snapshot.blocks])

  return null
}

const LargeDocumentStory: React.FC = () => {
  const setContent = useEditorStore((s) => s.setContent)
  const setMode = useEditorStore((s) => s.setMode)
  const collabConfig = useMemo<PresenceState>(() => ({
    userId: 'storybook-local',
    displayName: 'Storybook User',
    color: '#7c3aed',
  }), [])

  useEffect(() => {
    if (useEditorStore.getState().content !== largeDoc) {
      setContent(largeDoc)
    }
    setMode('preview')
  }, [setContent, setMode])

  return (
    <Editor autoFocus={false} collaboration={{ roomId: 'storybook-room', presence: collabConfig, transport: 'broadcast' }}>
      <DecorationSeed />
      <MetricsPanel />
    </Editor>
  )
}

export const LargeDocument: Story = {
  render: () => <LargeDocumentStory />,
}

const collaborativeDoc = `# Collaborative Notes\n\n- Edit on the left to see updates on the right.\n- Presence and selection highlights reflect simulated peers.`

type PeerProps = {
  label: string
  presence: { userId: string; displayName: string; color: string }
}

const CollaborativePeer: React.FC<PeerProps> = ({ label, presence }) => (
  <div className="flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-sm">
    <div className="text-sm font-medium text-muted-foreground">{label}</div>
    <Editor
      autoFocus={false}
      placeholder={`Editing as ${presence.displayName}`}
      collaboration={{ roomId: 'storybook-multi', presence, transport: 'broadcast' }}
      onCommentAction={(id) => console.log(`[comment] ${id}`)}
      onMentionAction={(id) => console.log(`[mention] ${id}`)}
    />
  </div>
)

const CollaborativePeersStory: React.FC = () => {
  const setContent = useEditorStore((s) => s.setContent)
  const setMode = useEditorStore((s) => s.setMode)

  useEffect(() => {
    if (useEditorStore.getState().content !== collaborativeDoc) {
      setContent(collaborativeDoc)
    }
    setMode('write')
  }, [setContent, setMode])

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <CollaborativePeer
        label="Peer: You"
        presence={{ userId: 'peer-you', displayName: 'You', color: '#2563eb' }}
      />
      <CollaborativePeer
        label="Peer: Jamie"
        presence={{ userId: 'peer-jamie', displayName: 'Jamie', color: '#f97316' }}
      />
    </div>
  )
}

export const CollaborativePeers: Story = {
  render: () => <CollaborativePeersStory />,
}

const wsDoc = `# WebSocket Transport Demo\n\nThis story uses the WebSocket collaboration provider with an in-memory mock socket.`

const WebSocketDemo: React.FC = () => {
  const setContent = useEditorStore((s) => s.setContent)
  const setMode = useEditorStore((s) => s.setMode)
  const [ops, setOps] = useState(0)
  const [avgDuration, setAvgDuration] = useState(0)

  useEffect(() => {
    if (useEditorStore.getState().content !== wsDoc) {
      setContent(wsDoc)
    }
    setMode('write')
  }, [setContent, setMode])

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        <div><strong>Simulated ops</strong>: {ops}</div>
        <div><strong>Avg bot txn (ms)</strong>: {avgDuration.toFixed(2)}</div>
      </div>
      <Editor
        autoFocus={false}
        placeholder="WebSocket demo"
        collaboration={{
          roomId: 'storybook-ws',
          presence: { userId: 'ws-user', displayName: 'WS User', color: '#10b981' },
          transport: 'websocket',
          url: 'ws://mock/ws',
          socketFactory: mockSocketFactory,
        }}
        onCommentAction={(id) => alert(`Reply to comment ${id}`)}
        onMentionAction={(id) => alert(`View mention ${id}`)}
      >
        <WebSocketBot setOps={setOps} setAvgDuration={setAvgDuration} />
      </Editor>
    </div>
  )
}

const WebSocketBot: React.FC<{ setOps: (n: number) => void; setAvgDuration: (n: number) => void }> = ({ setOps, setAvgDuration }) => {
  const { collaborationProvider } = useEditor()

  useEffect(() => {
    if (!collaborationProvider) return
    const provider = collaborationProvider
    let cancelled = false
    const remoteDoc = new Y.Doc()
    Y.applyUpdate(remoteDoc, Y.encodeStateAsUpdate(provider.doc))
    const text = remoteDoc.getText('content')

    const forwardUpdate = (update: Uint8Array, origin: any) => {
      if (origin === 'bot' || origin === 'replay') return
      remoteDoc.transact(() => {
        Y.applyUpdate(remoteDoc, update, 'replay')
      })
    }

    remoteDoc.on('update', (update, origin) => {
      if (origin !== 'bot') return
      provider.doc.transact(() => {
        Y.applyUpdate(provider.doc, update, 'bot')
      })
    })
    provider.doc.on('update', forwardUpdate)

    let timer: ReturnType<typeof setTimeout> | undefined
    const loop = () => {
      if (cancelled) return
      const start = performance.now()
      remoteDoc.transact(() => {
        const insertPos = Math.min(text.length, Math.floor(Math.random() * (text.length + 1)))
        text.insert(insertPos, ' ✨')
      }, 'bot')
      const diff = performance.now() - start
      setOps((prev) => prev + 1)
      setAvgDuration((prev) => (prev === 0 ? diff : prev * 0.9 + diff * 0.1))
      timer = setTimeout(loop, 2000)
    }

    timer = setTimeout(loop, 2000)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      provider.doc.off('update', forwardUpdate)
      remoteDoc.destroy()
    }
  }, [collaborationProvider, setAvgDuration, setOps])

  return null
}

export const WebSocketTransport: Story = {
  render: () => <WebSocketDemo />,
}
/* eslint-disable no-console */
