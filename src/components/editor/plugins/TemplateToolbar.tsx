"use client"
import React from 'react'
import { FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { TemplateGallery } from '@/components/templates/TemplateGallery'
import { useEditorStore } from '../state'
import type { EditorContext } from '@/lib/editor/types'

// Works in two environments:
// 1) Markdown Editor (EditorProvider + Toolbar): falls back to global editor store updates
// 2) Engine-agnostic EditorShell: receives `ctx` and inserts HTML via Range API
export function TemplateToolbarButton({ ctx }: { ctx?: EditorContext }) {
  const [open, setOpen] = React.useState(false)
  const setContent = useEditorStore((s) => s.setContent)
  const contentRef = React.useRef(useEditorStore.getState().content)

  React.useEffect(() => useEditorStore.subscribe((s) => (contentRef.current = s.content)), [])

  function insertHtmlAtSelection(html: string) {
    if (typeof document === 'undefined') return
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    // Ensure we are inside a contenteditable region; otherwise bail
    const container = (range.startContainer as Element | Text).parentElement?.closest('[contenteditable="true"]') as HTMLElement | null
    if (!container) return
    // Replace current selection with provided HTML
    range.deleteContents()
    const frag = range.createContextualFragment(html)
    range.insertNode(frag)
    sel.collapse(range.endContainer, range.endOffset)
    // Notify React listeners bound to the editable (EditorShell onInput)
    container.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const applyTemplate = async (id: string) => {
    const res = await fetch('/api/templates/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: id, context: {} }),
    })
    if (!res.ok) return
    const data = await res.json()

    if (ctx) {
      // EditorShell path: best-effort HTML insertion
      ctx.focus?.()
      insertHtmlAtSelection(String(data.content))
    } else {
      // Markdown Editor path: update shared store; EditorProvider syncs model from store
      const prev = contentRef.current
      const next = prev ? prev + (prev.endsWith('\n') ? '' : '\n\n') + String(data.content) : String(data.content)
      setContent(next)
    }
    setOpen(false)
  }

  return (
    <>
      <Button aria-label="Insert from template" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FilePlus className="h-4 w-4" />
      </Button>
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Insert Template</ModalTitle>
          </ModalHeader>
          <TemplateGallery onSelect={applyTemplate} />
        </ModalContent>
      </Modal>
    </>
  )
}
