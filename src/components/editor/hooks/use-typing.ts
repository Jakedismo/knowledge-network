"use client"
import { useEffect, useRef } from 'react'
import { useEditor } from '../EditorProvider'

/**
 * Updates awareness presence.typing flag while the user types in the editor textarea.
 */
export function useTypingIndicator() {
  const { collaborationProvider } = useEditor()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const provider = collaborationProvider
    if (!provider) return
    const el = (typeof document !== 'undefined') ? (document.activeElement as HTMLElement | null) : null
    const textarea = el && el.tagName === 'TEXTAREA' ? (el as HTMLTextAreaElement) : null
    if (!textarea) return
    const awareness = provider.awareness
    const setTyping = (typing: boolean) => {
      const cur = awareness.getLocalState() ?? {}
      const presence = { ...(cur as any).presence, typing }
      awareness.setLocalState({ ...(cur as any), presence })
    }
    const onKey = () => {
      setTyping(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setTyping(false), 900)
    }
    textarea.addEventListener('keydown', onKey)
    textarea.addEventListener('keyup', onKey)
    return () => {
      textarea.removeEventListener('keydown', onKey)
      textarea.removeEventListener('keyup', onKey)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [collaborationProvider])
}

