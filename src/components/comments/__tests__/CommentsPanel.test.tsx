import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { CommentsPanel } from '../../comments/CommentsPanel'

const now = new Date().toISOString()

vi.mock('@/lib/comments/api', () => {
  const threads = [
    { id: 't1', knowledgeId: 'k1', parentId: null, authorId: 'u1', content: 'Open thread', mentions: [], positionData: null, status: 'open', createdAt: now, updatedAt: now, replies: [] },
    { id: 't2', knowledgeId: 'k1', parentId: null, authorId: 'u2', content: 'Resolved thread', mentions: [], positionData: null, status: 'resolved', createdAt: now, updatedAt: now, replies: [] },
  ]
  return {
    commentApi: {
      list: vi.fn(async () => threads),
    },
  }
})

describe('CommentsPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filters threads by status', async () => {
    render(<CommentsPanel knowledgeId="k1" />)
    // both visible by default
    await waitFor(() => expect(screen.getByText('Open thread')).toBeInTheDocument())
    expect(screen.getByText('Resolved thread')).toBeInTheDocument()
    // filter open
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'open' } })
    expect(screen.getByText('Open thread')).toBeInTheDocument()
    expect(screen.queryByText('Resolved thread')).toBeNull()
  })
})

