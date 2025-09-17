import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EditorMode = 'write' | 'preview'

type EditorState = {
  content: string
  mode: EditorMode
  setContent: (value: string) => void
  setMode: (mode: EditorMode) => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      content: '',
      mode: 'write',
      setContent: (value) =>
        set((state) => (state.content === value ? state : { content: value })),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'kn-editor:v1',
      version: 1,
      partialize: (s) => ({ content: s.content, mode: s.mode }),
    }
  )
)
