import type { Meta, StoryObj } from '@storybook/react'
import { PluginManager } from '@/components/editor'
import { globalPluginRegistry } from '@/lib/editor/registry'
import { equationPlugin } from '@/components/editor/plugins/latex-equation'
import { youtubePlugin } from '@/components/editor/plugins/embed-youtube'
import { vimeoPlugin } from '@/components/editor/plugins/embed-vimeo'
import { twitterPlugin } from '@/components/editor/plugins/embed-twitter'

const meta: Meta<typeof PluginManager> = {
  title: 'Editor/PluginManager',
  component: PluginManager,
}

export default meta
type Story = StoryObj<typeof PluginManager>

// Register sample plugins
for (const [id, plugin] of [
  ['equation', equationPlugin],
  ['youtube', youtubePlugin],
  ['vimeo', vimeoPlugin],
  ['twitter', twitterPlugin],
] as const) {
  if (!globalPluginRegistry.get(id)) globalPluginRegistry.register(id, plugin)
}

export const Default: Story = {}

