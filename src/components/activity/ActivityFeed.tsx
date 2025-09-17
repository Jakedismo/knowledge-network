"use client"
import { useEffect, useState } from 'react'

type Item = {
  id: string
  action: string
  resourceType: string
  resourceId?: string | null
  createdAt: string
  score?: number
  metadata?: Record<string, unknown>
}

export default function ActivityFeed() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const res = await fetch('/api/activity/feed?limit=20', { cache: 'no-store' })
      const json = await res.json()
      setItems(json.items || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-sm text-gray-500">Loading activity…</div>

  return (
    <ul className="space-y-2">
      {items.map((e) => (
        <li key={e.id} className="text-sm p-2 border rounded">
          <div><span className="font-semibold">{e.action}</span> · {e.resourceType}{e.resourceId ? `:${e.resourceId.slice(0,6)}` : ''}</div>
          <div className="text-gray-600 text-xs">{new Date(e.createdAt).toLocaleString()} · score {e.score ?? 0}</div>
        </li>
      ))}
      {items.length === 0 && <li className="text-sm text-gray-500">No recent activity</li>}
    </ul>
  )}

