"use client"
import React from 'react'
import type { EditorPluginSpec, EditorContext } from '@/lib/editor/types'
import { sanitizeYouTubeUrl } from '@/lib/editor/sanitizers'

export function YouTubeEmbed({ url }: { url: string }) {
  const src = sanitizeYouTubeUrl(url)
  if (!src) return null
  return (
    <div className="aspect-video w-full rounded overflow-hidden bg-black">
      <iframe
        src={src}
        title="YouTube video"
        loading="lazy"
        className="h-full w-full"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

function YouTubeToolbar({ ctx }: { ctx: EditorContext }) {
  return (
    <button
      type="button"
      className="text-sm px-2 py-1 rounded hover:bg-accent"
      onClick={() => {
        const input = String(prompt('Paste a YouTube URL:') || '')
        const safe = sanitizeYouTubeUrl(input)
        if (!safe) return
        document.execCommand(
          'insertHTML',
          false,
          `<div data-node="youtube" data-url="${encodeURI(input)}"></div>`,
        )
        ctx.focus()
      }}
      aria-label="Insert YouTube"
    >
      ▶ YT
    </button>
  )
}

export const youtubePlugin: EditorPluginSpec = {
  name: 'youtube',
  version: '0.1.0',
  title: 'YouTube Embeds',
  description: 'Embed privacy-enhanced YouTube videos.',
  providesNodes: ['youtube'],
  ui: {
    Toolbar: YouTubeToolbar,
    Renderers: { youtube: YouTubeEmbed },
  },
  enabledByDefault: true,
}

