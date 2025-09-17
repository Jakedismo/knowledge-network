"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'
import type { EditorModel } from '@/lib/editor/model'
import type { AwarenessState } from '@/lib/collab/types'

export type SelectionOverlayProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  provider: CollaborationProvider | null
  model: EditorModel
  mode: 'write' | 'preview'
}

type Rect = { top: number; left: number; width: number; height: number; color?: string; id: number; name: string }

export function SelectionOverlay({ textareaRef, provider, model, mode }: SelectionOverlayProps) {
  const [rects, setRects] = useState<Rect[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const charWidthRef = useRef<number>(8)

  const computeMetrics = useCallback(() => {
    const el = textareaRef.current
    if (!el || typeof window === 'undefined') return { cw: 8, lh: 16, pt: 8, pl: 8 }
    const style = window.getComputedStyle(el)
    const lineHeight = parseFloat(style.lineHeight || '16') || 16
    const paddingTop = parseFloat(style.paddingTop || '0') || 0
    const paddingLeft = parseFloat(style.paddingLeft || '0') || 0
    const cw = measureCharWidth(style, canvasRef)
    charWidthRef.current = cw
    return { cw, lh: lineHeight, pt: paddingTop, pl: paddingLeft }
  }, [textareaRef])

  const blocks = useMemo(() => model.getBlocks(), [model])

  const updateRects = useCallback(() => {
    if (!provider) return setRects([])
    const el = textareaRef.current
    if (!el) return setRects([])
    const text = el.value
    const { cw, lh, pt, pl } = computeMetrics()
    const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : ({} as CSSStyleDeclaration)
    const scrollTop = el.scrollTop
    const scrollLeft = el.scrollLeft
    const clientHeight = el.clientHeight

    const next: Rect[] = []
    provider.awareness.getStates().forEach((state: unknown, clientId: number) => {
      if (clientId === provider.doc.clientID) return
      const s = state as AwarenessState
      const sel = s.selection
      if (!sel || !sel.range) return
      const block = blocks.find((b) => b.id === sel.blockId)
      if (!block) return
      const a = block.start + Math.min(sel.range.start, sel.range.end)
      const b = block.start + Math.max(sel.range.start, sel.range.end)
      const color = sel.color ?? s.presence?.color
      const name = s.presence?.displayName ?? `User ${clientId}`
      const segments = selectionLineSegments(text, a, b, style, canvasRef, charWidthRef.current)
      segments.forEach(({ row, x, width }) => {
        const top = pt + row * lh - scrollTop
        if (top < -lh || top > clientHeight + lh) return
        const left = pl + x - scrollLeft
        const base: Rect = { top, left, width, height: lh * 0.9, id: clientId, name }
        if (color) (base as any).color = color
        next.push(base)
      })
    })
    setRects(next)
  }, [blocks, computeMetrics, provider, textareaRef])

  useEffect(() => {
    if (!provider) return
    provider.awareness.on('update', updateRects)
    provider.doc.on('update', updateRects)
    updateRects()
    return () => {
      provider.awareness.off('update', updateRects)
      provider.doc.off('update', updateRects)
    }
  }, [provider, updateRects])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const h = () => updateRects()
    el.addEventListener('scroll', h)
    window.addEventListener('resize', h)
    return () => {
      el.removeEventListener('scroll', h)
      window.removeEventListener('resize', h)
    }
  }, [textareaRef, updateRects])

  useEffect(() => updateRects(), [mode, updateRects])
  useEffect(() => {
    const un = model.subscribe(updateRects)
    return () => un()
  }, [model, updateRects])

  if (!provider || mode !== 'write') return null
  return (
    <div className="pointer-events-none absolute inset-0">
      {rects.map((r, i) => (
        <div
          key={`${r.id}-${i}`}
          className="absolute rounded-sm opacity-40"
          style={{ top: r.top, left: r.left, width: r.width, height: r.height, backgroundColor: r.color ?? '#818cf8' }}
        />
      ))}
    </div>
  )
}

function measureCharWidth(style: CSSStyleDeclaration, canvasRef: React.MutableRefObject<HTMLCanvasElement | null>) {
  if (typeof window === 'undefined') return 8
  if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
  const ctx = canvasRef.current.getContext('2d')
  if (!ctx) return 8
  ctx.font = style.font || `${style.fontSize} ${style.fontFamily}`
  return ctx.measureText('M').width || 8
}

function selectionLineSegments(
  text: string,
  start: number,
  end: number,
  style: CSSStyleDeclaration,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  fallbackCw: number
): { row: number; x: number; width: number }[] {
  const a = Math.max(0, Math.min(start, end))
  const b = Math.max(a, Math.max(start, end))
  const lineStartA = text.lastIndexOf('\n', a - 1) + 1
  const lineStartB = text.lastIndexOf('\n', b - 1) + 1
  const rowA = countLines(text, a)
  const rowB = countLines(text, b)
  const measure = (s: number, e: number) => measureWidth(text, s, e, style, canvasRef, fallbackCw)
  if (rowA === rowB) {
    const x = measure(lineStartA, a)
    return [{ row: rowA, x, width: Math.max(1, measure(a, b)) }]
  }
  const segs: { row: number; x: number; width: number }[] = []
  // first line tail
  const xA = measure(lineStartA, a)
  const xAEnd = measure(lineStartA, text.indexOf('\n', a) === -1 ? text.length : text.indexOf('\n', a))
  segs.push({ row: rowA, x: xA, width: Math.max(1, xAEnd - xA) })
  // middle full lines
  for (let r = rowA + 1; r < rowB; r++) {
    const startIdx = nthLineStart(text, r)
    const endIdx = nthLineStart(text, r + 1)
    const width = measure(startIdx, endIdx)
    segs.push({ row: r, x: 0, width })
  }
  // last line head
  const xB = 0
  const widthB = measure(lineStartB, b)
  segs.push({ row: rowB, x: xB, width: Math.max(1, widthB) })
  return segs
}

function countLines(text: string, index: number): number {
  let count = 0
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') count += 1
  return count
}

function nthLineStart(text: string, n: number): number {
  if (n === 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      seen += 1
      if (seen === n) return i + 1
    }
  }
  return text.length
}

function measureWidth(
  text: string,
  start: number,
  end: number,
  style: CSSStyleDeclaration,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  fallbackCw: number
): number {
  if (typeof window === 'undefined') return Math.max(0, end - start) * fallbackCw
  if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
  const ctx = canvasRef.current.getContext('2d')
  if (!ctx) return Math.max(0, end - start) * fallbackCw
  ctx.font = style.font || `${style.fontSize} ${style.fontFamily}`
  const textSegment = text.slice(start, end).replace(/\t/g, '    ')
  return ctx.measureText(textSegment).width
}
