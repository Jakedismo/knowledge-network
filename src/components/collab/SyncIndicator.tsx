"use client"
import React, { useEffect, useRef, useState } from 'react'
import type { CollaborationProvider } from '@/lib/editor/collaboration/provider'

export type SyncIndicatorProps = {
  provider: CollaborationProvider | null
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  className?: string
}

export function SyncIndicator({ provider, status, className }: SyncIndicatorProps) {
  const [label, setLabel] = useState('Disconnected')
  const lastLocalUpdate = useRef<number>(0)

  useEffect(() => {
    if (!provider) {
      setLabel('Disconnected')
      return
    }
    const onDocUpdate = () => {
      lastLocalUpdate.current = Date.now()
      setLabel('Syncing…')
      // fall back to Synced after a short idle
      const t = setTimeout(() => {
        if (status === 'connected') setLabel('Synced')
      }, 500)
      return () => clearTimeout(t)
    }
    provider.doc.on('update', onDocUpdate)
    return () => provider.doc.off('update', onDocUpdate)
  }, [provider, status])

  useEffect(() => {
    if (status === 'connected') {
      // if no local updates in last 800ms, show Synced
      if (Date.now() - lastLocalUpdate.current > 800) setLabel('Synced')
    } else if (status === 'connecting') setLabel('Connecting…')
    else if (status === 'error') setLabel('Error')
    else setLabel('Disconnected')
  }, [status])

  const color =
    status === 'connected' ? 'bg-emerald-500' :
    status === 'connecting' ? 'bg-amber-400' :
    status === 'error' ? 'bg-red-500' : 'bg-muted-foreground'

  return (
    <div className={className} role="status" aria-live="polite">
      <span className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs">
        <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />
        {label}
      </span>
    </div>
  )
}

