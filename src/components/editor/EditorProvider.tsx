"use client"
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import type { EditorAPI, EditorContextValue, EditorPlugin } from './api'
import { useEditorStore } from './state'

const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within <EditorProvider>')
  return ctx
}

type EditorProviderProps = {
  children: React.ReactNode
}

export function EditorProvider({ children }: EditorProviderProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pluginsRef = useRef<Map<string, EditorPlugin>>(new Map())
  const content = useEditorStore((s) => s.content)
  const setContent = useEditorStore((s) => s.setContent)

  const api = useMemo<EditorAPI>(() => ({
    getContent: () => content,
    setContent: (value: string) => setContent(value),
    focus: () => textareaRef.current?.focus(),
    insertAtCursor: (markdown: string) => {
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const before = el.value.slice(0, start)
      const after = el.value.slice(end)
      const next = `${before}${markdown}${after}`
      setContent(next)
      // place cursor after inserted markdown
      const pos = (before + markdown).length
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
  }), [content, setContent])

  const registerPlugin = useCallback((plugin: EditorPlugin) => {
    pluginsRef.current.set(plugin.name, plugin)
    plugin.onInit?.({ getContent: () => api.getContent(), setContent: (md) => api.setContent(md) })
  }, [api])

  const unregisterPlugin = useCallback((name: string) => {
    pluginsRef.current.delete(name)
  }, [])

  const value = useMemo<EditorContextValue>(() => ({ api, registerPlugin, unregisterPlugin }), [api, registerPlugin, unregisterPlugin])

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

// Helper to attach the internal textarea ref to a concrete element
export const __internal = { /* reserved for future ref plumbing if needed */ }
