"use client"
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useEffect,
} from 'react'
import type { EditorAPI, EditorContextValue, EditorPlugin } from './api'
import { useEditorStore } from './state'
import { EditorModel } from '@/lib/editor/model'
import { TokenIndexer } from '@/lib/editor/token-index'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'

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
  const modelRef = useRef<EditorModel>()
  const indexerRef = useRef<TokenIndexer>()
  const collaborationRef = useRef<CollaborationProvider | null>(null)
  const [collaborationStatus, setCollaborationStatus] = React.useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const commentActionRef = useRef<(id: string) => void>(() => {})
  const mentionActionRef = useRef<(id: string) => void>(() => {})

  if (!modelRef.current) {
    modelRef.current = new EditorModel(content)
  }

  const model = modelRef.current

  useEffect(() => {
    if (model && model.getText() !== content) {
      model.setText(content)
    }
  }, [content, model])

  if (typeof window !== 'undefined' && !indexerRef.current) {
    indexerRef.current = new TokenIndexer()
  }

  const api = useMemo<EditorAPI>(() => ({
    getContent: () => model.getText(),
    setContent: (value: string) => {
      model.updateFromText(value)
      setContent(value)
    },
    focus: () => textareaRef.current?.focus(),
    insertAtCursor: (markdown: string) => {
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const before = el.value.slice(0, start)
      const after = el.value.slice(end)
      const next = `${before}${markdown}${after}`
      model.updateFromText(next)
      setContent(next)
      // place cursor after inserted markdown
      const pos = (before + markdown).length
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
  }), [model, setContent])

  const registerPlugin = useCallback((plugin: EditorPlugin) => {
    pluginsRef.current.set(plugin.name, plugin)
    plugin.onInit?.({ getContent: () => api.getContent(), setContent: (md) => api.setContent(md) })
  }, [api])

  const unregisterPlugin = useCallback((name: string) => {
    pluginsRef.current.delete(name)
  }, [])

  const setTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    textareaRef.current = el
  }, [])

  const setCollaborationProvider = useCallback((provider: CollaborationProvider | null) => {
    collaborationRef.current = provider
  }, [])

  const setCommentAction = useCallback((handler: (id: string) => void) => {
    commentActionRef.current = handler
  }, [])

  const setMentionAction = useCallback((handler: (id: string) => void) => {
    mentionActionRef.current = handler
  }, [])

  useEffect(() => {
    const indexer = indexerRef.current
    const unsubscribe = model.subscribe(() => {
      const snapshot = model.getSnapshot()
      indexer?.schedule(snapshot)
      setContent(snapshot.text)
    })
    indexer?.schedule(model.getSnapshot())
    return () => {
      unsubscribe()
    }
  }, [model, setContent])

  useEffect(() => {
    const indexer = indexerRef.current
    return () => {
      indexer?.dispose()
    }
  }, [])

  const value = useMemo<EditorContextValue>(() => ({
    api,
    registerPlugin,
    unregisterPlugin,
    setTextareaRef,
    model,
    tokenIndexer: indexerRef.current ?? null,
    collaborationProvider: collaborationRef.current,
    setCollaborationProvider,
    collaborationStatus,
    setCollaborationStatus,
    onCommentAction: commentActionRef.current,
    onMentionAction: mentionActionRef.current,
    setCommentAction,
    setMentionAction,
  }), [api, collaborationStatus, model, registerPlugin, setCollaborationProvider, setCollaborationStatus, setCommentAction, setMentionAction, setTextareaRef, unregisterPlugin])

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

// Helper to attach the internal textarea ref to a concrete element
export const __internal = { /* reserved for future ref plumbing if needed */ }
