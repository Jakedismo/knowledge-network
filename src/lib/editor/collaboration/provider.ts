import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'

export interface CollaborationProvider {
  readonly roomId: string
  readonly doc: Y.Doc
  readonly awareness: Awareness
  readonly transport: 'broadcast' | 'websocket'
  destroy(): void
}

