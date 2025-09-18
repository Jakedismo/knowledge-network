'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  MessageSquare,
  Star,
  BellRing,
  ArrowUpRight,
} from 'lucide-react'

const activityFeed = [
  {
    actor: 'Sarah Johnson',
    action: 'commented',
    target: 'AI Strategy Playbook',
    time: '2 minutes ago',
    detail: 'Flagged missing risk owner in section 3.',
  },
  {
    actor: 'Launch Guild',
    action: 'published',
    target: 'Go-Live Command Checklist',
    time: '23 minutes ago',
    detail: 'New version approved and shared with stakeholders.',
  },
  {
    actor: 'Operations Guild',
    action: 'added decision',
    target: 'Incident Response Postmortem',
    time: '1 hour ago',
    detail: 'Captured mitigation steps and owner follow-up.',
  },
  {
    actor: 'Assistant',
    action: 'suggested template',
    target: 'Automation Runbook',
    time: '2 hours ago',
    detail: 'Pre-filled steps from recent automation success story.',
  },
]

export default function CollaborationActivityPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Activity</h1>
          <p className="text-muted-foreground mt-2">
            Monitor comments, decisions, and AI-driven assistance across collaboration channels.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Live activity feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[440px] pr-4">
                <div className="space-y-4">
                  {activityFeed.map((event) => (
                    <div key={`${event.actor}-${event.time}`} className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            <span className="text-primary">{event.actor}</span> {event.action} <span className="text-primary">{event.target}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{event.detail}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Noteworthy threads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>#launch-go-live • 9 unread comments</p>
                <p>#ai-safety • 3 unresolved questions</p>
                <p>#automation-guild • 4 proposals awaiting feedback</p>
                <p>#customer-journeys • 2 reviews scheduled today</p>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-primary" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Assistant generated 12 actionable insights from collaboration last week.</p>
                <p>Reviews closed within SLA reached 92% for the past seven days.</p>
                <p>Knowledge reuse triggered by collaboration prompts increased 18% week over week.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BellRing className="h-4 w-4 text-primary" />
                  Alerts & nudges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span>Missing reviewer for incident report</span>
                  <Badge variant="outline">Action</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span>Assistant flagged stale decision log</span>
                  <Badge variant="secondary">Reminder</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span>Cross-team sync requested</span>
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
