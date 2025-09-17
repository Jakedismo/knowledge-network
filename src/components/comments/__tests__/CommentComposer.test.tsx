import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { CommentComposer } from '../../comments/CommentComposer'

vi.mock('@/lib/comments/api', () => {
  return {
    commentApi: {
      create: vi.fn(async (input) => ({ id: 'c1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'open', authorId: 'u_demo', mentions: input.mentions ?? [], knowledgeId: input.knowledgeId, parentId: input.parentId ?? null, content: input.content, positionData: input.positionData ?? null })),
    },
    userSuggest: {
      search: vi.fn(async (q: string) => [{ id: 'u_alex', displayName: 'Alex Johnson' }].filter((u) => u.displayName.toLowerCase().includes(q.toLowerCase()))),
    },
  }
})

describe('CommentComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts @mention from suggestions and posts', async () => {
    const onCreated = vi.fn()
    render(<CommentComposer knowledgeId="k1" onCreated={onCreated} />)
    const ta = screen.getByPlaceholderText(/Add a comment|Reply/i) as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'Hello @Al' } })
    // place caret at end to trigger detection
    ta.setSelectionRange(ta.value.length, ta.value.length)
    fireEvent.change(ta, { target: { value: ta.value } })
    // suggestion should appear
    await waitFor(() => expect(screen.getByText('Alex Johnson')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alex Johnson'))
    expect(ta.value).toContain('@Alex Johnson')
    fireEvent.click(screen.getByRole('button', { name: /comment|reply/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
  })
})

