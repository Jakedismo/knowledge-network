"use client"
import React from 'react'
import type { EditorPluginSpec, EditorContext } from '@/lib/editor/types'
import { sanitizeVimeoUrl } from '@/lib/editor/sanitizers'

export function VimeoEmbed({ url }: { url: string }) {
  const src = sanitizeVimeoUrl(url)
  if (!src) return null
  return (
    <div className="aspect-video w-full rounded overflow-hidden bg-black">
      <iframe
        src={src}
        title="Vimeo video"
        loading="lazy"
        className="h-full w-full"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

function VimeoToolbar({ ctx }: { ctx: EditorContext }) {
  return (
    <button
      type="button"
      className="text-sm px-2 py-1 rounded hover:bg-accent"
      onClick={() => {
        const input = String(prompt('Paste a Vimeo URL:') || '')
        const safe = sanitizeVimeoUrl(input)
        if (!safe) return
        document.execCommand('insertHTML', false, `<div data-node="vimeo" data-url="${encodeURI(input)}"></div>`)
        ctx.focus()
      }}
      aria-label="Insert Vimeo"
    >
      ▶ VM
    </button>
  )
}

export const vimeoPlugin: EditorPluginSpec = {
  name: 'vimeo',
  version: '0.1.0',
  title: 'Vimeo Embeds',
  description: 'Embed Vimeo videos with responsive layout.',
  providesNodes: ['vimeo'],
  ui: {
    Toolbar: VimeoToolbar,
    Renderers: { vimeo: VimeoEmbed },
  },
  enabledByDefault: false,
}

