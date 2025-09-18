'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Radio,
  Users,
  Activity,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'

const liveSessions = [
  {
    title: 'Launch Readiness Review — Platform Release',
    participants: ['Alice', 'Diego', 'Priya'],
    duration: '18m',
    document: 'Launch Control Checklist',
    status: 'On Track',
  },
  {
    title: 'Incident Postmortem — API Latency',
    participants: ['Maya', 'Zach', 'Wei'],
    duration: '27m',
    document: 'Incident #4589 timeline',
    status: 'Action Items',
  },
  {
    title: 'Automation Playbook Draft',
    participants: ['Nora', 'Samir'],
    duration: '12m',
    document: 'Automation Guild SOP',
    status: 'Reviewing',
  },
]

export default function CollaborationActivePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Active Sessions</h1>
            <p className="text-muted-foreground mt-2">
              Monitor real-time co-editing sessions, roles, and guardrail status for living documents.
            </p>
          </div>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Live sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[420px] pr-4">
              <div className="space-y-4">
                {liveSessions.map((session) => (
                  <div key={session.title} className="rounded-lg border bg-muted/40 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{session.title}</h3>
                        <p className="text-xs text-muted-foreground">Document: {session.document}</p>
                      </div>
                      <Badge variant="outline">{session.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {session.participants.join(', ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {session.duration}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="secondary">
                        Join session
                      </Button>
                      <Button size="sm" variant="ghost">
                        View timeline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Guardrails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Real-time sessions enforce reviewer roles, track edits, and capture decisions for audit trails.</p>
            <ul className="space-y-2 text-xs">
              <li>• Ownership is verified before granting edit controls.</li>
              <li>• AI monitors tone and missing context to prevent incomplete decisions.</li>
              <li>• Session summary posted to relevant collections and notifications.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
