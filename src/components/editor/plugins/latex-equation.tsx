"use client"
import React from 'react'
import type { EditorContext, EditorPluginSpec } from '@/lib/editor/types'

declare global {
  interface Window {
    katex?: {
      render: (tex: string, el: HTMLElement, opts?: Record<string, unknown>) => void
    }
  }
}

export interface EquationNodeProps {
  tex: string
  displayMode?: boolean
}

export function Equation({ tex, displayMode = false }: EquationNodeProps) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  const [fallback, setFallback] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!ref.current) return
    const { katex } = window
    if (katex && typeof katex.render === 'function') {
      try {
        katex.render(tex, ref.current, { displayMode, throwOnError: false })
        setFallback(null)
      } catch {
        setFallback(tex)
      }
    } else {
      setFallback(tex)
    }
  }, [tex, displayMode])

  if (fallback) {
    return (
      <code aria-label="LaTeX equation (fallback)" className="px-1 py-0.5 rounded bg-muted text-xs">
        {fallback}
      </code>
    )
  }
  return <span ref={ref} aria-label="LaTeX equation" />
}

function EquationToolbar({ ctx }: { ctx: EditorContext }) {
  return (
    <button
      type="button"
      className="text-sm px-2 py-1 rounded hover:bg-accent"
      onClick={() => {
        const selection = ctx.getSelectionText()
        const tex = selection || String(prompt('Enter LaTeX (without $):') || '')
        if (!tex) return
        // In a real engine, we would insert an equation node. For shell, just append.
        const html = `<span data-node="equation">$${tex}$</span>`
        document.execCommand('insertHTML', false, html)
        ctx.focus()
      }}
      aria-label="Insert equation"
    >
      ∑ Eq
    </button>
  )
}

export const equationPlugin: EditorPluginSpec = {
  name: 'equation',
  version: '0.1.0',
  title: 'LaTeX Equations',
  description: 'Insert and render LaTeX equations (KaTeX if available).',
  providesNodes: ['equation'],
  ui: {
    Toolbar: EquationToolbar,
    Renderers: {
      equation: Equation,
    },
  },
  enabledByDefault: true,
}

