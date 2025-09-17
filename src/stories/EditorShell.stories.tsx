import type { Meta, StoryObj } from '@storybook/react'
import { EditorShell } from '@/components/editor'
import { globalPluginRegistry } from '@/lib/editor/registry'
import { equationPlugin } from '@/components/editor/plugins/latex-equation'
import { youtubePlugin } from '@/components/editor/plugins/embed-youtube'

const meta: Meta<typeof EditorShell> = {
  title: 'Editor/EditorShell',
  component: EditorShell,
}

export default meta
type Story = StoryObj<typeof EditorShell>

// Register two plugins for the story runtime
if (!globalPluginRegistry.get('equation')) {
  globalPluginRegistry.register('equation', equationPlugin)
}
if (!globalPluginRegistry.get('youtube')) {
  globalPluginRegistry.register('youtube', youtubePlugin)
}

export const Basic: Story = {
  args: {
    initialContent:
      '<p>Welcome to the editor shell. Select text and click Eq to wrap as LaTeX.</p>',
  },
}

