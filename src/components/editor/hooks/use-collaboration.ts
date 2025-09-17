import { useEffect, useMemo, useRef } from 'react'
import * as Y from 'yjs'
import { useEditor } from '../EditorProvider'
import { YjsEditorAdapter } from '@/lib/editor/yjs-adapter'
import { BroadcastCollaborationProvider } from '@/lib/editor/collaboration/broadcast-provider'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'
import { WebSocketCollaborationProvider } from '@/lib/editor/collaboration/websocket-provider'
import { MCPWebSocketCollaborationProvider } from '@/lib/editor/collaboration/mcp-ws-provider'
import { logger } from '@/lib/logger'

export type PresenceState = {
  userId: string
  displayName?: string
  color?: string
}

type CollaborationOptions = {
  roomId: string
  presence: PresenceState
  transport?: 'broadcast' | 'websocket'
  url?: string
  doc?: Y.Doc
  socketFactory?: (url: string) => any
  token?: string
}

export function useCollaboration(options: CollaborationOptions) {
  const { model, setCollaborationProvider, setCollaborationStatus } = useEditor()
  const adapterRef = useRef<YjsEditorAdapter | null>(null)
  const providerRef = useRef<CollaborationProvider | null>(null)

  const doc = useMemo(() => options.doc ?? new Y.Doc(), [options.doc])

  useEffect(() => {
    let provider: CollaborationProvider
    setCollaborationStatus?.('connecting')
    // Resolve transport order: explicit option → env flag → fallback
    const envTransport = (process.env.NEXT_PUBLIC_COLLAB_TRANSPORT as 'broadcast' | 'websocket' | 'mcp-ws' | undefined)
    const transport = options.transport ?? envTransport ?? 'broadcast'

    if (transport === 'mcp-ws' && (options.url || process.env.NEXT_PUBLIC_COLLAB_WS_URL)) {
      try {
        provider = new MCPWebSocketCollaborationProvider({
          doc,
          roomId: options.roomId,
          url: options.url ?? (process.env.NEXT_PUBLIC_COLLAB_WS_URL as string),
          token: options.token ?? (process.env.NEXT_PUBLIC_COLLAB_TOKEN as string | undefined),
          sessionId: process.env.NEXT_PUBLIC_MCP_SESSION_ID as string | undefined,
          onStatus: setCollaborationStatus,
          useBinary: false,
        })
      } catch (err) {
        logger.warn('[Collaboration] MCP transport failed, falling back to websocket:', err)
        try {
          provider = new WebSocketCollaborationProvider({
            doc,
            roomId: options.roomId,
            url: options.url ?? (process.env.NEXT_PUBLIC_COLLAB_WS_URL as string),
            socketFactory: options.socketFactory,
            token: options.token ?? (process.env.NEXT_PUBLIC_COLLAB_TOKEN as string | undefined),
            onStatus: setCollaborationStatus,
          })
        } catch (err2) {
          logger.warn('[Collaboration] WebSocket fallback failed, using broadcast:', err2)
          provider = new BroadcastCollaborationProvider({ doc, roomId: options.roomId })
          setCollaborationStatus?.('connected')
        }
      }
    } else if (transport === 'websocket' && (options.url || process.env.NEXT_PUBLIC_COLLAB_WS_URL)) {
      try {
        provider = new WebSocketCollaborationProvider({
          doc,
          roomId: options.roomId,
          url: options.url ?? (process.env.NEXT_PUBLIC_COLLAB_WS_URL as string),
          socketFactory: options.socketFactory,
          token: options.token ?? (process.env.NEXT_PUBLIC_COLLAB_TOKEN as string | undefined),
          onStatus: setCollaborationStatus,
        })
      } catch (err) {
        logger.warn('[Collaboration] Falling back to broadcast transport:', err)
        provider = new BroadcastCollaborationProvider({ doc, roomId: options.roomId })
        setCollaborationStatus?.('connected')
      }
    } else {
      provider = new BroadcastCollaborationProvider({ doc, roomId: options.roomId })
      setCollaborationStatus?.('connected')
    }

    const adapter = new YjsEditorAdapter(model, { doc: provider.doc })

    provider.awareness.setLocalState({ presence: options.presence })
    const updatePresenceDecorations = () => {
      const awarenessStates = provider.awareness.getStates()
      model.clearDecorationsByType('presence')
      awarenessStates.forEach((state, clientId) => {
        if (clientId === provider.doc.clientID) return
        const selection = (state as any)?.selection as
          | { blockId: string; range?: { start: number; end: number }; color?: string; displayName?: string }
          | undefined
        if (selection && selection.blockId) {
          model.addBlockDecoration({
            id: `presence-${clientId}`,
            blockId: selection.blockId,
            type: 'presence',
            range: selection.range,
            data: {
              color: selection.color ?? (state as any)?.presence?.color,
              displayName: selection.displayName ?? (state as any)?.presence?.displayName,
            },
          })
        }
      })
    }

    provider.awareness.on('update', updatePresenceDecorations)
    provider.doc.on('update', updatePresenceDecorations)
    updatePresenceDecorations()

    adapterRef.current = adapter
    providerRef.current = provider
    setCollaborationProvider?.(provider)

    return () => {
      provider.awareness.off('update', updatePresenceDecorations)
      provider.doc.off('update', updatePresenceDecorations)
      adapter.destroy()
      provider.destroy()
      adapterRef.current = null
      providerRef.current = null
      setCollaborationProvider?.(null)
      setCollaborationStatus?.('disconnected')
    }
  }, [doc, model, options.presence, options.roomId, options.socketFactory, options.token, options.transport, options.url, setCollaborationProvider, setCollaborationStatus])

  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return
    const current = provider.awareness.getLocalState() ?? {}
    provider.awareness.setLocalState({ ...current, presence: options.presence })
  }, [options.presence])
}

export function useBroadcastCollaboration(roomId: string, presence: PresenceState) {
  useCollaboration({ roomId, presence, transport: 'broadcast' })
}
