"use client"
import React from 'react'
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Code2, Eye, EyeOff } from 'lucide-react'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useEditorStore } from './state'
import { useEditor } from './EditorProvider'
import { insertCodeBlock, insertImage, insertLink, insertHeading, surround, toggleList } from './toolbar-actions'

type ToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function Toolbar({ textareaRef }: ToolbarProps) {
  const mode = useEditorStore((s) => s.mode)
  const setMode = useEditorStore((s) => s.setMode)
  const content = useEditorStore((s) => s.content)
  const setContent = useEditorStore((s) => s.setContent)
  const { api } = useEditor()

  const getSel = (): { start: number; end: number } => {
    const el = textareaRef.current!
    return { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
  }

  const apply = (fn: (text: string, sel: { start: number; end: number }) => { next: string; newSel: { start: number; end: number } }) => {
    const el = textareaRef.current!
    const { start, end } = getSel()
    const { next, newSel } = fn(content, { start, end })
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newSel.start, newSel.end)
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    apply((t, sel) => insertImage(t, sel, url, file.name))
  }

  return (
    <div role="toolbar" aria-label="Formatting toolbar" className="flex flex-wrap items-center gap-1">
      <Button aria-label="Bold" variant="ghost" size="sm" onClick={() => apply((t, s) => surround(t, s, '**'))}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button aria-label="Italic" variant="ghost" size="sm" onClick={() => apply((t, s) => surround(t, s, '*'))}>
        <Italic className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Headings" variant="ghost" size="sm">
            <Heading1 className="h-4 w-4" />
          </Button>
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
          const url = prompt('Enter URL:') ?? ''
          if (!url) return
          apply((t, s) => insertLink(t, s, url))
        }}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <label aria-label="Insert image" className="inline-flex">
        <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
        <Button asChild variant="ghost" size="sm">
          <span><ImageIcon className="h-4 w-4" /></span>
        </Button>
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Insert code block" variant="ghost" size="sm">
            <Code2 className="h-4 w-4" />
          </Button>
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
    </div>
  )
}

