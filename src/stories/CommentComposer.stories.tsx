import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { CommentComposer } from '@/components/comments/CommentComposer'

const meta: Meta<typeof CommentComposer> = {
  title: 'Collaboration/CommentComposer',
  component: CommentComposer,
  parameters: { layout: 'centered' },
}
export default meta

type Story = StoryObj<typeof CommentComposer>

export const Empty: Story = {
  args: { knowledgeId: 'demo-knowledge', workspaceId: 'demo-workspace' },
  render: (args) => (
    <div style={{ width: 360 }}>
      <CommentComposer {...args} />
    </div>
  ),
}

