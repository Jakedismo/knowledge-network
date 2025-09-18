import { globalPluginRegistry } from '@/lib/editor/registry'
import type { EditorContext, EditorPluginSpec } from '@/lib/editor/types'
import { AssistantSuggestions } from '@/components/editor/plugins/AssistantSuggestions'

export function registerAssistantPlugin() {
  const spec: EditorPluginSpec = {
    name: 'assistant-suggestions',
    version: '0.1.0',
    title: 'Assistant Suggestions',
    description: 'Shows AI-powered writing suggestions based on the current selection.',
    ui: {
      Renderers: {},
      Toolbar: ({ ctx }: { ctx: EditorContext }) => {
        return (
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={() => ctx.focus()}
            aria-label="Focus editor to refresh suggestions"
          >
            Suggestions
          </button>
        )
      },
      SettingsPanel: ({ enabled }: { enabled: boolean }) => (
        <div className="text-sm">Assistant suggestions are {enabled ? 'enabled' : 'disabled'}.</div>
      ),
    },
    onInit(ctx: EditorContext) {
      // Optionally, could subscribe to selection changes when engine allows.
      void ctx
    },
  }
  globalPluginRegistry.register('assistant.suggestions', spec)
  // Also expose a component the editor shell can place in a sidebar
  return { Sidebar: AssistantSuggestions }
}

