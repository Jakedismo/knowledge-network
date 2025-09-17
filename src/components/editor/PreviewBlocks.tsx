"use client"
import React, {
  useMemo,
  useRef,
  useSyncExternalStore,
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
} from 'react'
import type {
  EditorModel,
  EditorSnapshot,
  EditorBlock,
  BlockDecoration,
} from '@/lib/editor/model'
import { markdownToHtml } from './markdown/parser'
import { useVirtualList } from '@/lib/performance'
import { cn } from '@/lib/utils'

type PreviewBlocksProps = {
  model: EditorModel
  enableEmbeds?: boolean
  maxHeight?: number | string
  onCommentAction?: (id: string) => void
  onMentionAction?: (id: string) => void
}

type BlockCacheEntry = {
  hash: string
  html: string
}

type BlockEntry = {
  block: EditorBlock
  html: string
  decorations: BlockDecoration[]
}

const VIRTUALIZE_BLOCK_THRESHOLD = 80

export function PreviewBlocks({
  model,
  enableEmbeds = true,
  maxHeight = '70vh',
  onCommentAction,
  onMentionAction,
}: PreviewBlocksProps) {
  const snapshot = useModelSnapshot(model)
  const cacheRef = useRef<Map<string, BlockCacheEntry>>(new Map())
  const heightsRef = useRef<Map<string, number>>(new Map())
  const [avgHeight, setAvgHeight] = useState(160)
  const [containerHeight, setContainerHeight] = useState(600)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const blockEntries = useMemo<BlockEntry[]>(() => {
    const cache = cacheRef.current
    return snapshot.blocks.map((block) => {
      const decorations = snapshot.decorations[block.id] ?? []
      return {
        block,
        html: getBlockHtml(block, decorations, enableEmbeds, cache),
        decorations,
      }
    })
  }, [snapshot.blocks, snapshot.decorations, enableEmbeds])

  const shouldVirtualize = blockEntries.length > VIRTUALIZE_BLOCK_THRESHOLD || snapshot.text.length > 20_000

  useEffect(() => {
    if (!shouldVirtualize) {
      heightsRef.current.clear()
      setAvgHeight(160)
    }
  }, [shouldVirtualize])

  useLayoutEffect(() => {
    if (!shouldVirtualize) return
    const el = containerRef.current
    if (!el) return
    const updateHeight = () => {
      setContainerHeight(el.clientHeight || 600)
    }
    updateHeight()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateHeight())
      observer.observe(el)
      return () => observer.disconnect()
    }
    return undefined
  }, [shouldVirtualize])

  const handleMeasured = useCallback((id: string, height: number) => {
    if (!shouldVirtualize) return
    const prev = heightsRef.current.get(id)
    if (prev && Math.abs(prev - height) < 4) return
    heightsRef.current.set(id, height)
    const values = Array.from(heightsRef.current.values())
    if (values.length === 0) return
    const nextAvg = values.reduce((sum, h) => sum + h, 0) / values.length
    if (Math.abs(avgHeight - nextAvg) > 4) {
      setAvgHeight(nextAvg)
    }
  }, [avgHeight, shouldVirtualize])

  const itemHeight = Math.min(Math.max(avgHeight, 48), 480)
  const virtual = useVirtualList({
    items: blockEntries,
    itemHeight,
    containerHeight: shouldVirtualize ? Math.max(containerHeight, itemHeight) : containerHeight,
    overscan: 6,
  })

  const visibleEntries = shouldVirtualize ? virtual.visibleItems.items : blockEntries
  const contentClass = 'prose prose-sm dark:prose-invert max-w-none'
  const containerStyle = shouldVirtualize
    ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }
    : undefined

  return shouldVirtualize ? (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      style={containerStyle}
      onScroll={virtual.handleScroll}
    >
      <div style={{ height: virtual.totalHeight }}>
        <div className={contentClass} style={{ transform: `translateY(${virtual.offsetY}px)` }}>
          {visibleEntries.map((entry) => (
            <BlockView
              key={entry.block.id}
              entry={entry}
              onMeasure={handleMeasured}
              virtualized
              onCommentAction={onCommentAction}
              onMentionAction={onMentionAction}
          />
        ))}
        </div>
      </div>
    </div>
  ) : (
    <div className={contentClass} ref={containerRef}>
      {visibleEntries.map((entry) => (
        <BlockView
          key={entry.block.id}
          entry={entry}
          onCommentAction={onCommentAction}
          onMentionAction={onMentionAction}
        />
      ))}
    </div>
  )
}

type BlockViewProps = {
  entry: BlockEntry
  onMeasure?: (id: string, height: number) => void
  virtualized?: boolean
  onCommentAction?: (id: string) => void
  onMentionAction?: (id: string) => void
}

function BlockView({ entry, onMeasure, virtualized = false, onCommentAction, onMentionAction }: BlockViewProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null)

  const setNode = useCallback((el: HTMLDivElement | null) => {
    nodeRef.current = el
  }, [])

  useEffect(() => {
    if (!virtualized || !onMeasure || !nodeRef.current) return
    const el = nodeRef.current
    const measure = () => {
      const rect = el.getBoundingClientRect()
      onMeasure(entry.block.id, rect.height)
    }
    const raf = requestAnimationFrame(measure)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measure())
      observer.observe(el)
    }
    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [entry.block.id, entry.html, onMeasure, virtualized])

  const decorationTypes = entry.decorations.map((d) => d.type).join(' ')
  const highlight = entry.decorations.some((d) => d.type === 'highlight')
  const comments = entry.decorations.filter((d) => d.type === 'comment')
  const mentions = entry.decorations.filter((d) => d.type === 'mention')
  const [showPopover, setShowPopover] = useState(false)

  return (
    <div
      ref={setNode}
      data-block-id={entry.block.id}
      data-decoration-types={decorationTypes || undefined}
      className={cn('relative', highlight && 'bg-amber-50 dark:bg-amber-900/30 rounded-sm px-1')}
    >
      <div
        className="pointer-events-auto"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />
      {(comments.length > 0 || mentions.length > 0) && (
        <div
          className="absolute top-1 right-1 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border"
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
        >
          {comments.length > 0 && <span aria-label={`${comments.length} comments`}>💬 {comments.length}</span>}
          {mentions.length > 0 && (
            <span
              aria-label={`${mentions.length} mentions`}
              title={mentions
                .map((m) => {
                  const user = (m.data as Record<string, unknown> | undefined)?.user
                  return typeof user === 'string' ? user : undefined
                })
                .filter(Boolean)
                .join(', ')}
            >
              @ {mentions.length}
            </span>
          )}
          {showPopover && (
            <div className="pointer-events-auto absolute right-0 top-full z-10 mt-1 w-56 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
              {comments.length > 0 && (
                <div className="mb-3 space-y-1">
                  <div className="font-medium">Comments</div>
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex flex-col gap-1 rounded border p-2">
                      <div className="flex items-center justify-between">
                        <span>{(comment.data as any)?.author ?? 'Someone'}</span>
                        {(comment.data as any)?.count ? (
                          <span className="text-muted-foreground">{(comment.data as any)?.count}</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="self-start rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                        onClick={() => onCommentAction?.(comment.id)}
                      >
                        Reply
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {mentions.length > 0 && (
                <div className="space-y-1">
                  <div className="font-medium">Mentions</div>
                  {mentions.map((mention) => (
                    <div key={mention.id} className="flex items-center justify-between rounded border p-2">
                      <span>{(mention.data as any)?.user ?? '@unknown'}</span>
                      <button
                        type="button"
                        className="rounded bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground hover:bg-secondary/80"
                        onClick={() => onMentionAction?.(mention.id)}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function useModelSnapshot(model: EditorModel): EditorSnapshot {
  return useSyncExternalStore(
    (listener) => model.subscribe(listener),
    () => model.getSnapshot(),
    () => model.getSnapshot()
  )
}

function getBlockHtml(
  block: EditorBlock,
  decorations: BlockDecoration[],
  enableEmbeds: boolean,
  cache: Map<string, BlockCacheEntry>
) {
  const decorKey = decorations
    .map((d) => `${d.id}:${d.type}:${d.range ? `${d.range.start}-${d.range.end}` : 'x'}`)
    .join('|')
  const key = `${block.id}-${block.hash}-${enableEmbeds ? 'emb' : 'noemb'}-${decorKey}`
  const hit = cache.get(key)
  if (hit) {
    return hit.html
  }
  const raw = block.text + block.gap
  let html = markdownToHtml(raw, { enableEmbeds })
  if (decorations.some((d) => d.range)) {
    html = applyInlineDecorations(html, decorations)
  }
  cache.set(key, { hash: block.hash, html })
  return html
}

function applyInlineDecorations(html: string, decorations: BlockDecoration[]): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const container = doc.body.firstElementChild as HTMLElement | null
  if (!container) return html
  const inlineDecorations = decorations.filter((d) => d.range)
  inlineDecorations.sort((a, b) => (a.range!.start ?? 0) - (b.range!.start ?? 0))
  for (const decoration of inlineDecorations) {
    const range = decoration.range!
    highlightRange(container, range.start, range.end, decoration)
  }
  return container.innerHTML
}

function highlightRange(
  container: HTMLElement,
  start: number,
  end: number,
  decoration: BlockDecoration
) {
  if (end <= start) return
  const doc = container.ownerDocument
  if (!doc) return
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let offset = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const length = node.textContent?.length ?? 0
    const nodeStart = offset
    const nodeEnd = offset + length
    const rangeStart = Math.max(start, nodeStart)
    const rangeEnd = Math.min(end, nodeEnd)
    if (rangeStart < rangeEnd && node.parentNode) {
      const rangeNodeStart = rangeStart - nodeStart
      const rangeNodeEnd = rangeEnd - nodeStart
      const rangeObj = doc.createRange()
      rangeObj.setStart(node, rangeNodeStart)
      rangeObj.setEnd(node, rangeNodeEnd)
      const span = doc.createElement('span')
      span.dataset.decorationId = decoration.id
      span.dataset.decorationType = decoration.type
      const baseColor = (decoration.data?.color as string | undefined) ?? defaultDecorationColor(decoration.type)
      span.style.backgroundColor = baseColor
      span.style.borderRadius = '3px'
      span.style.padding = '0.05em 0.15em'
      if (decoration.type === 'mention' && typeof decoration.data?.user === 'string') {
        span.title = `Mention ${decoration.data.user}`
      }
      try {
        rangeObj.surroundContents(span)
      } catch (err) {
        // ignore overlapping ranges
      }
      rangeObj.detach()
    }
    offset = nodeEnd
    if (offset >= end) break
  }
}

function defaultDecorationColor(type: string): string {
  switch (type) {
    case 'presence':
      return 'rgba(129, 140, 248, 0.35)'
    case 'mention':
      return 'rgba(96, 165, 250, 0.35)'
    case 'comment':
      return 'rgba(248, 180, 0, 0.25)'
    default:
      return 'rgba(16, 185, 129, 0.25)'
  }
}
