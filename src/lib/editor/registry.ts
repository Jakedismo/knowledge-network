import { RegisteredPlugin, EditorPluginSpec } from './types'

// Simple in-memory registry. Can be swapped for Zustand/store later.
export class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map()

  register(id: string, spec: EditorPluginSpec): RegisteredPlugin {
    if (this.plugins.has(id)) {
      throw new Error(`Plugin already registered: ${id}`)
    }
    const reg: RegisteredPlugin = {
      id,
      enabled: spec.enabledByDefault ?? true,
      ...spec,
    }
    this.plugins.set(id, reg)
    return reg
  }

  unregister(id: string): void {
    const p = this.plugins.get(id)
    if (p?.onDestroy) p.onDestroy()
    this.plugins.delete(id)
  }

  list(): RegisteredPlugin[] {
    return Array.from(this.plugins.values())
  }

  get(id: string): RegisteredPlugin | undefined {
    return this.plugins.get(id)
  }

  setEnabled(id: string, enabled: boolean): void {
    const p = this.plugins.get(id)
    if (!p) throw new Error(`Unknown plugin: ${id}`)
    p.enabled = enabled
  }

  // Collect UI contributions for active plugins
  getActiveRenderers(): Record<string, React.ComponentType<any>> {
    const map: Record<string, React.ComponentType<any>> = {}
    for (const p of this.plugins.values()) {
      if (!p.enabled) continue
      const r = p.ui?.Renderers
      if (r) Object.assign(map, r)
    }
    return map
  }

  getActiveToolbars(): React.ComponentType<any>[] {
    const items: React.ComponentType<any>[] = []
    for (const p of this.plugins.values()) {
      if (!p.enabled) continue
      const T = p.ui?.Toolbar
      if (T) items.push(T)
    }
    return items
  }
}

export const globalPluginRegistry = new PluginRegistry()

