"use client"
import React from 'react'
import { FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { TemplateGallery } from '@/components/templates/TemplateGallery'
import { useEditorStore } from '../state'
import { useEditor } from '../EditorProvider'

export function TemplateToolbarButton() {
  const [open, setOpen] = React.useState(false)
  const setContent = useEditorStore((s) => s.setContent)
  const contentRef = React.useRef(useEditorStore.getState().content)
  const { model } = useEditor()

  React.useEffect(() => useEditorStore.subscribe((s) => (contentRef.current = s.content)), [])

  const applyTemplate = async (id: string) => {
    const res = await fetch('/api/templates/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: id, context: {} }),
    })
    if (!res.ok) return
    const data = await res.json()
    const next = contentRef.current ? contentRef.current + (contentRef.current.endsWith('\n') ? '' : '\n\n') + data.content : data.content
    model.updateFromText(next)
    setContent(next)
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

