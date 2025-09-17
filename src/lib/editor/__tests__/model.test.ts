import { describe, it, expect } from 'vitest'
import { EditorModel } from '../model'

describe('EditorModel', () => {
  it('updates via diff on small edits', () => {
    const model = new EditorModel('Hello world')
    model.updateFromText('Hello brave world')
    expect(model.getText()).toBe('Hello brave world')
    const blocks = model.getBlocks()
    expect(blocks[0].text).toContain('Hello brave world')
  })

  it('replaceRange inserts and deletes with rope backing', () => {
    const model = new EditorModel('Alpha Beta Gamma')
    model.replaceRange(6, 11, 'Delta ')
    expect(model.getText()).toBe('Alpha Delta Gamma')
  })

  it('subscribe notifies with snapshot changes', () => {
    const model = new EditorModel('One\n\nTwo')
    let called = 0
    const unsub = model.subscribe(() => {
      called += 1
    })
    model.updateFromText('One\n\nTwo\n\nThree')
    unsub()
    expect(called).toBeGreaterThan(0)
    expect(model.getBlocks().length).toBe(3)
  })

  it('clears decorations by type', () => {
    const model = new EditorModel('Alpha\n\nBeta')
    const blockId = model.getBlocks()[0].id
    model.addBlockDecoration({ id: 'p1', blockId, type: 'presence', range: { start: 0, end: 5 } })
    model.addBlockDecoration({ id: 'c1', blockId, type: 'comment' })
    expect((model.getDecorations(blockId) as any[]).length).toBe(2)
    model.clearDecorationsByType('presence')
    const decorations = model.getDecorations(blockId) as any[]
    expect(decorations).toHaveLength(1)
    expect(decorations[0].type).toBe('comment')
  })
})
