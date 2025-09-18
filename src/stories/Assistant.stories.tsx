import type { Meta, StoryObj } from '@storybook/react'
import { ChatPanel } from '@/components/assistant/ChatPanel'
import { ResearchPanel } from '@/components/assistant/ResearchPanel'
import { TranscriptionUploader } from '@/components/assistant/TranscriptionUploader'
import { FactCheckBadge } from '@/components/assistant/FactCheckBadge'

const meta = {
  title: 'Assistant/Overview',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj

export const Chat: Story = {
  render: () => <ChatPanel />,
}

export const Research: Story = {
  render: () => <ResearchPanel />,
}

export const Transcription: Story = {
  render: () => <TranscriptionUploader />,
}

export const FactCheck: Story = {
  render: () => <FactCheckBadge claim="All documents always include an owner field" />,
}

