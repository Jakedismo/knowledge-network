"use client"
import React, { useEffect, useMemo, useRef } from 'react'
import { logger } from '@/lib/logger'
import { markdownToHtml } from './markdown/parser'

const KATEX_VERSION = '0.16.9'
const PRISM_VERSION = '1.29.0'

const PRISM_LANGUAGE_FILES = [
  'prism-typescript.min.js',
  'prism-tsx.min.js',
  'prism-jsx.min.js',
  'prism-json.min.js',
  'prism-bash.min.js',
  'prism-go.min.js',
  'prism-rust.min.js',
  'prism-python.min.js',
  'prism-markdown.min.js',
  'prism-yaml.min.js',
]

function detectLanguages(md: string): string[] {
  const langs = new Set<string>(['prism-markdown.min.js'])
  const fence = /```\s*([a-zA-Z0-9+\-._]+)/g
  let m: RegExpExecArray | null
  while ((m = fence.exec(md))) {
    const lang = (m[1] || '').toLowerCase()
    switch (lang) {
      case 'ts':
      case 'typescript': langs.add('prism-typescript.min.js'); break
      case 'tsx': langs.add('prism-tsx.min.js'); break
      case 'jsx':
      case 'javascript':
      case 'js': langs.add('prism-jsx.min.js'); break
      case 'json': langs.add('prism-json.min.js'); break
      case 'bash':
      case 'sh': langs.add('prism-bash.min.js'); break
      case 'go': langs.add('prism-go.min.js'); break
      case 'rust':
      case 'rs': langs.add('prism-rust.min.js'); break
      case 'py':
      case 'python': langs.add('prism-python.min.js'); break
      case 'yaml':
      case 'yml': langs.add('prism-yaml.min.js'); break
      default:
        // Unknowns ignored; Prism will render as plain
        break
    }
  }
  return Array.from(langs)
}

function loadCssOnce(id: string, href: string) {
  if (typeof document === 'undefined') return Promise.resolve()
  if (document.getElementById(id)) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`))
    document.head.appendChild(link)
  })
}

function loadScriptOnce(id: string, src: string) {
  if (typeof document === 'undefined') return Promise.resolve()
  if (document.getElementById(id)) {
    const script = document.getElementById(id) as HTMLScriptElement
    if (script.dataset.loaded === 'true') return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false

    const enhance = async () => {
      try {
        await Promise.all([
          loadCssOnce('katex-css', `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`),
          loadCssOnce('prism-css', `https://cdn.jsdelivr.net/npm/prismjs@${PRISM_VERSION}/themes/prism-tomorrow.min.css`),
          loadScriptOnce('katex-js', `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`),
          loadScriptOnce('prism-core', `https://cdn.jsdelivr.net/npm/prismjs@${PRISM_VERSION}/prism.min.js`),
        ])

        const langs = detectLanguages(markdown)
        await Promise.all(
          langs.map((file) =>
            loadScriptOnce(
              `prism-${file}`,
              `https://cdn.jsdelivr.net/npm/prismjs@${PRISM_VERSION}/components/${file}`
            )
          )
        )

        if (cancelled || !ref.current) return

        window.Prism?.highlightAllUnder(ref.current)

        if (window.katex) {
          ref.current.querySelectorAll<HTMLElement>('.katex-math').forEach((node) => {
            if (node.getAttribute('data-katex-rendered') === 'true') return
            const tex = node.textContent ?? ''
            try {
              const rendered = window.katex.renderToString(tex, { throwOnError: false })
              node.innerHTML = rendered
              node.setAttribute('data-katex-rendered', 'true')
              node.setAttribute('role', 'math')
              node.setAttribute('aria-label', tex)
            } catch (err) {
              logger.error('KaTeX render failed', err)
            }
          })
        }
      } catch (err) {
        logger.error('Preview enhancements failed', err)
      }
    }

    enhance()

    return () => {
      cancelled = true
    }
  }, [html])

  return (
    <div
      ref={ref}
      className="prose prose-sm dark:prose-invert max-w-none"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
