"use client"

import React from 'react'
import { cn } from '@/lib/utils'

type Health = { ok: boolean; configured: boolean; model?: string; engine?: string; engineReady?: boolean }

export function AIStatusBadge({ className }: { className?: string }) {
  const [health, setHealth] = React.useState<Health | null>(null)
  const devMode = Boolean(process.env.NEXT_PUBLIC_DEV_USER_ID)
  const streaming = process.env.NEXT_PUBLIC_ASSISTANT_STREAM === 'true'

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/ai/health', { cache: 'no-store' })
        const data = (await res.json()) as Health
        if (!cancelled) setHealth(data)
      } catch {
        if (!cancelled) setHealth({ ok: false, configured: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const online = Boolean(health?.configured && health?.engineReady)
  const color = online ? 'bg-emerald-500' : 'bg-amber-500'
  const label = online ? 'AI Online' : 'AI Limited'
  const engine = health?.engine ?? 'agents'

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <span className={cn('inline-block h-2 w-2 rounded-full', color)} aria-hidden />
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground">· {engine}{streaming ? ' (stream)' : ''}</span>
      {devMode ? (
        <span className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Dev Mode</span>
      ) : null}
    </div>
  )
}

export default AIStatusBadge

