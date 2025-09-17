import type { EditorPlugin } from '../api'

export const DragDropImages: EditorPlugin = {
  name: 'drag-drop-images',
  onDrop: async (files, api) => {
    const array = Array.from(files as FileList)
    for (const f of array) {
      if (!f.type.startsWith('image/')) continue
      const url = URL.createObjectURL(f)
      api.insertAtCursor(`![${f.name}](${url})`)
    }
  },
}

