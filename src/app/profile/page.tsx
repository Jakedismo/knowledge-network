'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import {
  User,
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'

const expertise = ['Launch Readiness', 'Automation Ops', 'Knowledge Governance']
const recentContributions = [
  {
    title: 'Launch Control Room Handbook',
    detail: 'Published new version and aligned with compliance reviewers.',
    time: 'Yesterday',
  },
  {
    title: 'Automation Retrospective Template',
    detail: 'Collaborated with automation guild to refresh template.',
    time: '2 days ago',
  },
  {
    title: 'Incident Response Decision Log',
    detail: 'Captured mitigation steps and assigned follow-up.',
    time: 'Last week',
  },
]

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src="/avatars/alex.png"
              alt="Alex Rivera"
              size="xl"
              showStatus
              status="online"
              fallback={<span className="text-lg font-semibold">AR</span>}
              className="border-2 border-primary/40"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Alex Rivera</h1>
              <p className="text-muted-foreground">
                Principal Knowledge Strategist · Launch Governance
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  8 yrs tenure
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Helsinki · Hybrid
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              View org chart
            </Button>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Ask for insight
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent contributions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentContributions.map((item) => (
                <div key={item.title} className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expertise</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs">
                {expertise.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Trust & signals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Certified reviewer for Launch, Security, and Compliance workflows.</p>
                <p>AI assistant surfaces Alex for decision reviews and risk assessments.</p>
                <p>Knowledge score in top 5% for dwell time and reuse.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
