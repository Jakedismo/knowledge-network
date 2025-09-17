"use client"
import React, { useEffect, useMemo, useRef } from 'react'
import { markdownToHtml } from './markdown/parser'

type PreviewProps = {
  markdown: string
  enableEmbeds?: boolean
}

export function Preview({ markdown, enableEmbeds = true }: PreviewProps) {
  const html = useMemo(() => markdownToHtml(markdown, { enableEmbeds }), [markdown, enableEmbeds])
  const ref = useRef<HTMLDivElement | null>(null)

  // Basic focus management: keep focus inside preview on Tab if preview focused
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // prevent trapping in iframes by default; allow natural flow
      }
    }
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      ref={ref}
      className="prose prose-sm dark:prose-invert max-w-none"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

