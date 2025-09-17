import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Editor } from '../components/editor'

const meta: Meta<typeof Editor> = {
  title: 'Editor/RichTextEditor',
  component: Editor,
}

export default meta
type Story = StoryObj<typeof Editor>

export const Basic: Story = {
  args: {
    placeholder: 'Write your notes here…',
  },
}

