import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useRef, useState } from 'react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import { CommentsPanel } from '@/components/comments/CommentsPanel'
import { commentApi, userSuggest } from '@/lib/comments/api'
import type { CommentModel } from '@/types/comments'

const meta: Meta<typeof CommentsPanel> = {
  title: 'Collaboration/CommentsPanel.Interactions',
  component: CommentsPanel,
  parameters: { layout: 'centered' },
}
export default meta

type Story = StoryObj<typeof CommentsPanel>

function InMemoryProvider({ knowledgeId, children }: { knowledgeId: string; children: React.ReactNode }) {
  const backups = useRef({
    list: commentApi.list,
    create: commentApi.create,
    update: commentApi.update,
    remove: commentApi.remove,
    suggest: userSuggest.search,
  })
  const [threads, setThreads] = useState<CommentModel[]>([])
  useEffect(() => {
    commentApi.list = async () => threads
    commentApi.create = async (input) => {
      const now = new Date().toISOString()
      const model: CommentModel = {
        id: `${Math.random().toString(36).slice(2)}`,
        knowledgeId: input.knowledgeId,
        parentId: input.parentId ?? null,
        authorId: 'storybook',
        content: input.content,
        mentions: input.mentions ?? [],
        positionData: input.positionData ?? null,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        replies: [],
      }
      setThreads((prev) => [...prev, model])
      return model
    }
    commentApi.update = async (id, patch) => {
      let next: CommentModel | null = null
      setThreads((prev) => prev.map((t) => {
        if (t.id !== id) return t
        next = { ...t, ...patch, updatedAt: new Date().toISOString() }
        return next
      }))
      return next as CommentModel
    }
    commentApi.remove = async (id) => {
      setThreads((prev) => prev.filter((t) => t.id !== id))
    }
    userSuggest.search = async (q: string) => [{ id: 'u_demo', displayName: 'Alex Johnson' }].filter((u) => u.displayName.toLowerCase().includes(q.toLowerCase()))
    return () => {
      commentApi.list = backups.current.list
      commentApi.create = backups.current.create
      commentApi.update = backups.current.update
      commentApi.remove = backups.current.remove
      userSuggest.search = backups.current.suggest
    }
  }, [threads])
  return <>{children}</>
}

export const AddAndResolve: Story = {
  args: { knowledgeId: 'k_story', workspaceId: 'w_story' },
  render: (args) => (
    <div style={{ width: 360 }}>
      <InMemoryProvider knowledgeId={args.knowledgeId!}>
        <CommentsPanel {...args} />
      </InMemoryProvider>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Add a comment
    const ta = canvas.getByPlaceholderText(/Add a comment/i)
    await userEvent.type(ta, 'Hello @Al')
    await waitFor(() => canvas.getByText('Alex Johnson'))
    await userEvent.click(canvas.getByText('Alex Johnson'))
    await userEvent.click(canvas.getByRole('button', { name: /comment/i }))
    await waitFor(() => canvas.getByText('Hello @Alex Johnson'))
    // Resolve it
    await userEvent.click(canvas.getByRole('button', { name: /Resolve/i }))
    await waitFor(() => expect(canvas.getByText(/Hello @Alex Johnson/)).toBeInTheDocument())
  },
}

