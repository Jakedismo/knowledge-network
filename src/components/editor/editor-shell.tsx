"use client"
import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { globalPluginRegistry } from '@/lib/editor/registry'
import type { EditorContext } from '@/lib/editor/types'

interface EditorShellProps {
  className?: string
  initialContent?: string
  onChange?: (html: string) => void
}

// Minimal contenteditable shell while we keep the engine pluggable.
// This provides toolbar slots and renderers via the plugin registry.
export function EditorShell({ className, initialContent = '', onChange }: EditorShellProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)

  const ctx = React.useMemo<EditorContext>(() => ({
    focus: () => ref.current?.focus(),
    getSelectionText: () => (typeof window !== 'undefined' ? window.getSelection()?.toString() ?? '' : ''),
    dispatch: () => {
      // No-op in the shell baseline; real engines will map actions
    },
  }), [])

  const Toolbars = globalPluginRegistry.getActiveToolbars()

  const handleInput = React.useCallback(() => {
    if (!ref.current) return
    onChange?.(ref.current.innerHTML)
  }, [onChange])

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-t-md bg-background">
        <Button variant="ghost" size="sm" onClick={() => ctx.focus()} aria-label="Focus editor">
          Focus
        </Button>
        <Separator orientation="vertical" className="h-6" />
        {Toolbars.map((T, i) => (
          <T key={i} ctx={ctx} />
        ))}
      </div>
      <div
        ref={ref}
        className={cn(
          'prose dark:prose-invert prose-sm sm:prose base p-4 border-x border-b rounded-b-md min-h-[200px] focus:outline-none',
          'max-w-none',
        )}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: initialContent }}
      />
    </div>
  )
}

