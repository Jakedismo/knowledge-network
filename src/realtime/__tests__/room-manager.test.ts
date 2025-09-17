import { describe, it, expect } from 'vitest'
import { Room } from '../../realtime/room'
import { FileVersionStore } from '../../realtime/storage/version-store'
import * as Y from 'yjs'

class MockConn {
  public sent: string[] = []
  send(data: string) { this.sent.push(data) }
  close() {}
}

describe('Room', () => {
  it('applies updates and broadcasts to peers', () => {
    const store = new FileVersionStore('data/test-collab')
    const room = new Room('r1', store)

    const a = new MockConn()
    const b = new MockConn()
    room.connect(a)
    room.connect(b)

    const doc = new Y.Doc()
    doc.getText('content').insert(0, 'hello')
    const update = Array.from(Y.encodeStateAsUpdate(doc))
    room.handleMessage(a as any, JSON.stringify({ type: 'update', roomId: 'r1', update }))

    // b should get an update message
    const got = b.sent.find((s) => s.includes('"type":"update"'))
    expect(got).toBeTruthy()
  })
})

