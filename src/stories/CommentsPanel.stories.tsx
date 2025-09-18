import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { CommentsPanel } from '@/components/comments/CommentsPanel'

const meta: Meta<typeof CommentsPanel> = {
  title: 'Collaboration/CommentsPanel',
  component: CommentsPanel,
  parameters: { layout: 'centered' },
}
export default meta

type Story = StoryObj<typeof CommentsPanel>

export const Basic: Story = {
  args: { knowledgeId: 'demo-knowledge', workspaceId: 'demo-workspace' },
  render: (args) => (
    <div style={{ width: 320 }}>
      <CommentsPanel {...args} />
    </div>
  ),
}

