// Editor core and plugin system types
// Kept framework-agnostic so we can adapt to Slate/Lexical/TipTap later

export type EditorCommandId =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'insertEquation'
  | 'insertEmbed'
  | 'undo'
  | 'redo'

export interface EditorCommand {
  id: EditorCommandId | (string & {})
  label: string
  icon?: React.ReactNode
  execute: (ctx: EditorContext, payload?: unknown) => void
  isEnabled?: (ctx: EditorContext) => boolean
  isActive?: (ctx: EditorContext) => boolean
}

export interface EditorContext {
  // Minimal surface area the engine must provide
  focus: () => void
  getSelectionText: () => string
  // Dispatch an engine-specific command (e.g., toggle mark)
  dispatch: (action: { type: string; payload?: unknown }) => void
}

export interface EditorPluginUI {
  // Optional toolbar controls contributed by plugin
  Toolbar?: React.ComponentType<{ ctx: EditorContext }>
  // Render block/inline nodes via components; key identifies node type
  Renderers?: Record<string, React.ComponentType<any>>
  // Optional settings panel component used by PluginManager
  SettingsPanel?: React.ComponentType<{ enabled: boolean; onToggle: (v: boolean) => void }>
}

export interface EditorPluginSpec {
  name: string
  version: string
  title: string
  description?: string
  // Unique keys for schema/node types provided (e.g., 'equation', 'embed')
  providesNodes?: string[]
  // Commands the plugin contributes
  commands?: EditorCommand[]
  // Optional UI contributions
  ui?: EditorPluginUI
  // Lifecycle
  onInit?: (ctx: EditorContext) => void
  onDestroy?: () => void
  // Enable/disable at runtime without removing code
  enabledByDefault?: boolean
}

export interface RegisteredPlugin extends EditorPluginSpec {
  id: string // unique runtime id
  enabled: boolean
}

export interface EditorTheme {
  density: 'comfortable' | 'compact'
  accent: 'blue' | 'violet' | 'green' | 'orange'
}

