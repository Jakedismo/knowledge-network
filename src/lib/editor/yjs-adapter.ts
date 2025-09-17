import * as Y from 'yjs'
import { EditorModel, computeDiff } from './model'

type AdapterOptions = {
  doc?: Y.Doc
  field?: string
}

/**
 * YjsEditorAdapter bridges EditorModel with a Yjs document, supporting
 * collaborative editing via CRDT deltas.
 */
export class YjsEditorAdapter {
  private readonly doc: Y.Doc
  private readonly field: string
  private readonly text: Y.Text
  private readonly model: EditorModel
  private applyingRemote = false
  private applyingLocal = false
  private unsubscribeModel?: () => void

  constructor(model: EditorModel, options: AdapterOptions = {}) {
    this.model = model
    this.doc = options.doc ?? new Y.Doc()
    this.field = options.field ?? 'content'
    this.text = this.doc.getText(this.field)

    // Bootstrap shared text from either side
    const yValue = this.text.toString()
    const modelValue = model.getText()
    if (yValue.length === 0 && modelValue.length > 0) {
      this.doc.transact(() => {
        this.text.insert(0, modelValue)
      })
    } else if (yValue !== modelValue) {
      model.setText(yValue)
    }

    this.unsubscribeModel = model.subscribe(this.handleModelChange)
    this.text.observe(this.handleRemoteChange)
  }

  getDoc(): Y.Doc {
    return this.doc
  }

  destroy(): void {
    this.unsubscribeModel?.()
    this.text.unobserve(this.handleRemoteChange)
  }

  private handleModelChange = () => {
    if (this.applyingRemote) return
    const target = this.text.toString()
    const next = this.model.getText()
    if (target === next) return

    const diff = computeDiff(target, next)
    if (!diff) return

    this.applyingLocal = true
    this.doc.transact(() => {
      if (diff.removeLength > 0) {
        this.text.delete(diff.start, diff.removeLength)
      }
      if (diff.inserted.length > 0) {
        this.text.insert(diff.start, diff.inserted)
      }
    })
    this.applyingLocal = false
  }

  private handleRemoteChange = (event: Y.YEvent<Y.TextEvent>) => {
    if (this.applyingLocal) return
    this.applyingRemote = true
    let index = 0
    for (const op of event.delta) {
      if (op.retain) {
        index += op.retain
      }
      if (op.delete) {
        this.model.replaceRange(index, index + op.delete, '')
      }
      if (typeof op.insert === 'string') {
        this.model.replaceRange(index, index, op.insert)
        index += op.insert.length
      }
    }
    this.applyingRemote = false
  }
}

export type { YjsEditorAdapter as EditorCollaborationAdapter }

