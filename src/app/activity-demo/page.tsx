import ActivityFeed from '@/components/activity/ActivityFeed'
import NotificationsBell from '@/components/notifications/NotificationsBell'

export const dynamic = 'force-dynamic'

export default function ActivityDemoPage() {
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Activity & Notifications Demo</h1>
        <NotificationsBell />
      </div>
      <ActivityFeed />
    </main>
  )
}

