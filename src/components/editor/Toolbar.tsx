"use client"
import React from 'react'
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Code2, Eye, EyeOff } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { useEditorStore } from './state'
import { logger } from '@/lib/logger'
import { insertCodeBlock, insertImage, insertLink, insertHeading, surround, toggleList, type Selection } from './toolbar-actions'
import { cn } from '@/lib/utils'
import { useMediaUpload } from './use-media-upload'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '../ui/modal'
import { useEditor } from './EditorProvider'

type ToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onAnnounce?: (message: string) => void
}

export function Toolbar({ textareaRef, onAnnounce }: ToolbarProps) {
  const mode = useEditorStore((s) => s.mode)
  const setMode = useEditorStore((s) => s.setMode)
  const content = useEditorStore((s) => s.content)
  const setContent = useEditorStore((s) => s.setContent)
  const { model } = useEditor()
  const contentRef = React.useRef(content)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const { uploadMedia, status: uploadStatus, error } = useMediaUpload()
  const isUploading = uploadStatus === 'uploading'
  const [linkModalOpen, setLinkModalOpen] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState('')
  const [linkLabel, setLinkLabel] = React.useState('')
  const selectionRef = React.useRef<Selection | null>(null)

  React.useEffect(() => {
    contentRef.current = content
  }, [content])

  React.useEffect(() => {
    if (error) {
      logger.error('Image upload failed. Inserted local preview instead.', error)
      onAnnounce?.('Image upload failed; inserted local preview instead.')
    }
  }, [error, onAnnounce])

  const getSel = React.useCallback((): Selection => {
    const el = textareaRef.current!
    return { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
  }, [textareaRef])

  const apply = React.useCallback((
    fn: (text: string, sel: Selection) => { next: string; newSel: Selection },
    selection?: Selection
  ) => {
    const el = textareaRef.current
    if (!el) return undefined
    const baseSelection = selection ?? getSel()
    const { next, newSel } = fn(contentRef.current, baseSelection)
    contentRef.current = next
    model.updateFromText(next)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newSel.start, newSel.end)
    })
    return newSel
  }, [getSel, model, setContent, textareaRef])

  const insertUploadedImage = React.useCallback(
    async (file: File, selection?: Selection) => {
      const targetSelection = selection ?? getSel()
      onAnnounce?.(`Uploading image ${file.name}…`)
      const result = await uploadMedia(file)
      apply((t, sel) => insertImage(t, sel, result.url, file.name), targetSelection)
      if (result.error) {
        setTimeout(() => {
          if (result.url.startsWith('blob:')) {
            URL.revokeObjectURL(result.url)
          }
        }, 10_000)
        onAnnounce?.(`Upload failed for ${file.name}; inserted local preview.`)
      } else {
        onAnnounce?.(`Image uploaded: ${file.name}`)
      }
    },
    [apply, uploadMedia, getSel, onAnnounce]
  )

  return (
    <div role="toolbar" aria-label="Formatting toolbar" className="flex flex-wrap items-center gap-1">
      <Button aria-label="Bold" variant="ghost" size="sm" onClick={() => apply((t, s) => surround(t, s, '**'))}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button aria-label="Italic" variant="ghost" size="sm" onClick={() => apply((t, s) => surround(t, s, '*'))}>
        <Italic className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          aria-label="Headings"
        >
          <Heading1 className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => apply((t, s) => insertHeading(t, s, 1))}><Heading1 className="mr-2 h-4 w-4" /> H1</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => apply((t, s) => insertHeading(t, s, 2))}><Heading2 className="mr-2 h-4 w-4" /> H2</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => apply((t, s) => insertHeading(t, s, 3))}><Heading3 className="mr-2 h-4 w-4" /> H3</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button aria-label="Bullet list" variant="ghost" size="sm" onClick={() => apply((t, s) => toggleList(t, s, false))}>
        <List className="h-4 w-4" />
      </Button>
      <Button aria-label="Numbered list" variant="ghost" size="sm" onClick={() => apply((t, s) => toggleList(t, s, true))}>
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        aria-label="Insert link"
        variant="ghost"
        size="sm"
        onClick={() => {
          const selection = getSel()
          selectionRef.current = selection
          const selectedText = contentRef.current.slice(selection.start, selection.end)
          setLinkLabel(selectedText)
          setLinkUrl('')
          setLinkModalOpen(true)
        }}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <span className="inline-flex">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Image upload"
          data-testid="editor-image-input"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            await insertUploadedImage(file)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
        />
        <Button
          aria-label="Insert image"
          variant="ghost"
          size="sm"
          loading={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          aria-label="Insert code block"
        >
          <Code2 className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {['', 'ts', 'js', 'tsx', 'jsx', 'python', 'go', 'rust', 'bash', 'json', 'yaml'].map((lang) => (
            <DropdownMenuItem key={lang || 'plain'} onSelect={() => apply((t, s) => insertCodeBlock(t, s, lang))}>
              {lang || 'plain'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto" />
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList aria-label="Editor mode tabs">
          <TabsTrigger value="write" aria-label="Write"><EyeOff className="mr-2 h-4 w-4" />Write</TabsTrigger>
          <TabsTrigger value="preview" aria-label="Preview"><Eye className="mr-2 h-4 w-4" />Preview</TabsTrigger>
        </TabsList>
      </Tabs>

      <Modal open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <ModalContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const rawUrl = linkUrl.trim()
              if (!rawUrl) return
              const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
              const selection = selectionRef.current ?? getSel()
              apply((text, sel) => insertLink(text, sel, normalizedUrl, linkLabel.trim() || undefined), selection)
              setLinkModalOpen(false)
              setLinkUrl('')
              setLinkLabel('')
              selectionRef.current = null
            }}
          >
            <ModalHeader>
              <ModalTitle>Insert Link</ModalTitle>
              <ModalDescription>Add a URL and optional label for the selected text.</ModalDescription>
            </ModalHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="editor-link-url">URL</Label>
                <Input
                  id="editor-link-url"
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="editor-link-label">Link text (optional)</Label>
                <Input
                  id="editor-link-label"
                  placeholder="Visible label"
                  value={linkLabel}
                  onChange={(event) => setLinkLabel(event.target.value)}
                />
              </div>
            </div>
            <ModalFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setLinkModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Insert link</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  )
}
