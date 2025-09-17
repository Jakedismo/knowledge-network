import { describe, it, beforeEach, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor } from '../Editor'
import { useEditorStore } from '../state'

const uploadMediaMock = vi.fn(async (file: File) => ({
  url: `https://cdn.example/${file.name}`,
}))

vi.mock('../use-media-upload', () => ({
  useMediaUpload: () => ({
    status: 'idle',
    error: null,
    uploadMedia: uploadMediaMock,
  }),
}))

describe('Editor interactions', () => {
  beforeEach(() => {
    uploadMediaMock.mockClear()
    useEditorStore.setState({ content: '', mode: 'write' })
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  it('inserts a link via the toolbar modal', async () => {
    const user = userEvent.setup()
    render(<Editor />)

    const textarea = screen.getByLabelText(/markdown editor/i)
    await user.type(textarea, 'Hello world')

    act(() => {
      textarea.setSelectionRange(6, 11) // select "world"
    })

    await user.click(screen.getByLabelText(/insert link/i))

    const urlInput = await screen.findByLabelText('URL')
    await user.type(urlInput, 'example.com')
    await user.click(screen.getByRole('button', { name: /insert link/i }))

    await waitFor(() => {
      expect(textarea.value).toContain('[world](https://example.com)')
    })
  })

  it('uploads an image via toolbar and announces result', async () => {
    const user = userEvent.setup()
    render(<Editor />)

    const textarea = screen.getByLabelText(/markdown editor/i)
    await user.type(textarea, 'Start')

    const insertImageButton = screen.getByLabelText(/insert image/i)
    await user.click(insertImageButton)

    const fileInput = screen.getByTestId('editor-image-input') as HTMLInputElement
    const file = new File(['dummy'], 'cat.png', { type: 'image/png' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(textarea.value).toContain('![cat.png](https://cdn.example/cat.png)')
    })

    const liveRegion = screen.getByTestId('editor-live-region')
    await waitFor(() => {
      expect(liveRegion.textContent).toBe('Image uploaded: cat.png')
    })
  })
})
