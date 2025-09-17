import { globalPluginRegistry } from '@/lib/editor/registry'
import type { EditorPluginSpec } from '@/lib/editor/types'
import { TemplateToolbarButton } from '@/components/editor/plugins/TemplateToolbar'

let registered = false

export function registerTemplateEditorPlugin() {
  if (registered) return
  const spec: EditorPluginSpec = {
    name: 'templates',
    version: '1.0.0',
    title: 'Templates',
    description: 'Insert content from templates into the editor',
    enabledByDefault: true,
    ui: {
      Toolbar: TemplateToolbarButton,
    },
  }
  globalPluginRegistry.register('templates', spec)
  registered = true
}
