"use client"
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { globalPluginRegistry } from '@/lib/editor/registry'

export function PluginManager() {
  const [, force] = React.useReducer((x: number) => x + 1, 0)
  const plugins = globalPluginRegistry.list()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor Plugins</CardTitle>
        <CardDescription>Enable or disable capabilities. Changes apply immediately.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plugins.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-muted-foreground">{p.description}</div>
              {p.ui?.SettingsPanel ? (
                <div className="mt-2">
                  <p.ui.SettingsPanel
                    enabled={p.enabled}
                    onToggle={(v) => {
                      globalPluginRegistry.setEnabled(p.id, v)
                      force()
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={`plugin-${p.id}`} className="sr-only">
                Toggle {p.title}
              </label>
              <input
                id={`plugin-${p.id}`}
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => {
                  globalPluginRegistry.setEnabled(p.id, e.target.checked)
                  force()
                }}
                className="h-5 w-5"
              />
            </div>
          </div>
        ))}
        <Separator />
        <div className="text-xs text-muted-foreground">{plugins.length} plugin(s) registered</div>
      </CardContent>
    </Card>
  )
}
