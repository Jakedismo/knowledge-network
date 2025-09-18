'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Users,
  Activity,
  Radio,
  Zap,
  MessageCircle,
  ArrowRight,
} from 'lucide-react'

const collaborationHighlights = [
  {
    title: 'Live co-editing',
    description: '5 active sessions across launch runbooks and incident postmortems.',
    href: '/collaboration/active',
  },
  {
    title: 'Team activity digest',
    description: '32 comments and 18 mentions in the last 24 hours.',
    href: '/collaboration/activity',
  },
  {
    title: 'Peer reviews',
    description: '7 open approvals pending for compliance and product releases.',
    href: '/collaboration/reviews',
  },
]

const channels = [
  {
    label: 'Launch Readiness',
    signal: 'High activity',
    details: 'Cross-functional teams preparing for April go-lives.',
    badge: 'Launch',
  },
  {
    label: 'Incident Command',
    signal: 'Stable',
    details: 'Weekly drill in progress; knowledge refresh scheduled.',
    badge: 'Operations',
  },
  {
    label: 'Automation Guild',
    signal: 'Spiking',
    details: 'Automation templates adoption increased 14%.',
    badge: 'Innovation',
  },
]

export default function CollaborationPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Collaboration</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Monitor live sessions, coordinate reviews, and keep teams aligned while working inside the knowledge network.
            </p>
          </div>
          <Link
            href="/collaboration/active"
            className={cn(buttonVariants(), 'gap-2')}
          >
            <Radio className="h-4 w-4" />
            Open live sessions
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {collaborationHighlights.map((highlight) => (
            <Card key={highlight.title} className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">{highlight.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{highlight.description}</p>
                <Link
                  href={highlight.href}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
                >
                  View details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="channels" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="reviews">Approvals</TabsTrigger>
          </TabsList>

          <TabsContent value="channels">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {channels.map((channel) => (
                <Card key={channel.label} className="border border-dashed">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{channel.label}</span>
                      <Badge variant="secondary">{channel.badge}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{channel.details}</p>
                    <p className="text-xs uppercase tracking-wide text-foreground">{channel.signal}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="signals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Engagement signals
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="font-semibold text-foreground">Mentions up 24%</p>
                  <p className="text-xs text-muted-foreground">AI assistant notifications driving review follow-ups.</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="font-semibold text-foreground">Sessions average 12m</p>
                  <p className="text-xs text-muted-foreground">Teams co-editing decision logs stay within expected guardrails.</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="font-semibold text-foreground">Comments to decision ratio 3.2</p>
                  <p className="text-xs text-muted-foreground">Healthy balance between discussion and outcomes.</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="font-semibold text-foreground">Approvals SLA 9h</p>
                  <p className="text-xs text-muted-foreground">Operations reviews trending toward target threshold.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Review workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Compliance and product approvals tracked with SLA alerts and fallback reviewers.</p>
                <ul className="space-y-2 text-xs">
                  <li>• Auto-assign reviewers based on document taxonomy and ownership.</li>
                  <li>• Escalate to channel leads if reviews breach the 24h SLA.</li>
                  <li>• Notifications delivered via assistant, email, and Slack.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
