"use client"
import React from 'react'
import type { EditorPluginSpec, EditorContext } from '@/lib/editor/types'
import { sanitizeTwitterUrl } from '@/lib/editor/sanitizers'

export function TweetEmbed({ url }: { url: string }) {
  const safe = sanitizeTwitterUrl(url)
  if (!safe) return null
  // Lightweight privacy-friendly card; avoid remote scripts by default.
  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer noopener"
      className="block rounded border p-3 no-underline hover:bg-accent"
      aria-label="Open tweet in a new tab"
    >
      <div className="text-xs text-muted-foreground">twitter.com</div>
      <div className="mt-1 text-sm">View post</div>
    </a>
  )
}

function TwitterToolbar({ ctx }: { ctx: EditorContext }) {
  return (
    <button
      type="button"
      className="text-sm px-2 py-1 rounded hover:bg-accent"
      onClick={() => {
        const input = String(prompt('Paste a Twitter/X URL:') || '')
        const safe = sanitizeTwitterUrl(input)
        if (!safe) return
        document.execCommand('insertHTML', false, `<div data-node="tweet" data-url="${encodeURI(input)}"></div>`)
        ctx.focus()
      }}
      aria-label="Insert Tweet"
    >
      𝕏
    </button>
  )
}

export const twitterPlugin: EditorPluginSpec = {
  name: 'twitter',
  version: '0.1.0',
  title: 'Twitter/X Embeds',
  description: 'Link-card style embeds for posts without remote scripts by default.',
  providesNodes: ['tweet'],
  ui: {
    Toolbar: TwitterToolbar,
    Renderers: { tweet: TweetEmbed },
  },
  enabledByDefault: false,
}

