"use client"
import { useEffect, useRef, useState } from 'react'

export type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/notifications?unreadOnly=false', { cache: 'no-store' })
      const json = await res.json()
      setItems(json.items || [])
    })()
    const es = new EventSource('/api/notifications/stream')
    es.addEventListener('message', (e) => {
      const payload = JSON.parse((e as MessageEvent).data)
      if (payload.kind === 'notification') {
        setItems((prev) => [payload.data, ...prev])
      } else if (payload.kind === 'notification:update') {
        setItems((prev) => prev.map((it) => (it.id === payload.data.id ? payload.data : it)))
      }
    })
    esRef.current = es
    return () => { es.close() }
  }, [])

  const unread = items.filter((i) => !i.isRead).length

  return (
    <div className="relative">
      <button aria-label="Notifications" className="relative" onClick={() => setOpen((v) => !v)}>
        <span className="inline-block">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1" aria-label={`${unread} unread notifications`}>{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded border bg-white shadow">
          <div className="p-2 text-sm font-medium border-b">Notifications</div>
          <ul className="divide-y">
            {items.map((n) => (
              <li key={n.id} className="p-2 text-sm">
                <div className="font-medium">{n.title}</div>
                <div className="text-gray-600">{n.message}</div>
              </li>
            ))}
            {items.length === 0 && <li className="p-2 text-sm text-gray-500">No notifications</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

