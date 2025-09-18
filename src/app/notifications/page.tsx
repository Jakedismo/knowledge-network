'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Clock,
} from 'lucide-react'

const alerts = [
  {
    title: 'Review request: Launch Readiness Checklist',
    detail: 'Assigned by Launch PMO · due in 6h',
    type: 'action',
  },
  {
    title: 'Incident postmortem summary ready',
    detail: 'Assistant compiled highlights from Incident #4589',
    type: 'info',
  },
  {
    title: 'Security runbook flagged for update',
    detail: 'Stale content detected · last edited 90 days ago',
    type: 'warning',
  },
]

const digest = [
  '12 documents published in the Launch Control collection',
  'AI assistant answered 74 questions in the last 24h',
  'Mentions for you: 3 in #automation and 1 in #ai-safety',
]

export default function NotificationsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground mt-2">
              Keep track of review assignments, assistant insights, and collaboration activity.
            </p>
          </div>
          <Button variant="outline">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="digest">Daily digest</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Actionable alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.title} className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.detail}</p>
                    </div>
                    <Badge
                      variant={
                        alert.type === 'warning' ? 'destructive' : alert.type === 'action' ? 'secondary' : 'outline'
                      }
                    >
                      {alert.type === 'warning' ? 'Attention' : alert.type === 'action' ? 'Action' : 'Info'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="digest">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-primary" />
                  Daily digest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {digest.map((item) => (
                  <div key={item} className="rounded-md border bg-background px-3 py-2">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Notification history
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Past alerts roll off after 60 days and remain accessible through audit exports.</p>
                <div className="rounded-lg border bg-muted/40 px-3 py-2">
                  Export CSV · Last exported 2 days ago
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
