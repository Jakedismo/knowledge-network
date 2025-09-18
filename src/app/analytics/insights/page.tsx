'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  TrendingUp,
  Activity,
  Gauge,
  BarChart3,
} from 'lucide-react'

const momentumSignals = [
  {
    title: 'Launch enablement',
    change: '+18.4%',
    insight: 'Collections tagged launch readiness have the highest engagement this week.',
  },
  {
    title: 'Automation initiatives',
    change: '+12.6%',
    insight: 'Cross-functional automation hub usage spiked after new SOP rollout.',
  },
  {
    title: 'Security drills',
    change: '+9.3%',
    insight: 'Incident response runbooks trending after tabletop exercise.',
  },
]

const adoptionScores = [
  { label: 'Knowledge freshness', value: 82 },
  { label: 'Search success rate', value: 76 },
  { label: 'Collaboration coverage', value: 68 },
  { label: 'Template adoption', value: 71 },
]

const aiInsights = [
  {
    headline: 'Assistant accelerates template usage',
    detail: 'Documents created via AI suggestions have a 34% higher completion rate.',
  },
  {
    headline: 'Collections with verified owners trend upwards',
    detail: 'Ownership signals correlate with 2.3x higher weekly revisits.',
  },
  {
    headline: 'Search queries without results',
    detail: 'Top gaps: "partner onboarding", "billing workflow", "support SLA".',
  },
]

export default function AnalyticsInsightsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              AI distilled trends and signals sourced from knowledge, search, collaboration, and assistant activity.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            Updated {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {momentumSignals.map((signal) => (
            <Card key={signal.title} className="border-2">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {signal.title}
                </CardTitle>
                <span className="text-xs font-semibold text-emerald-500">{signal.change}</span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{signal.insight}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="adoption" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="adoption">Adoption</TabsTrigger>
            <TabsTrigger value="ai">AI insights</TabsTrigger>
            <TabsTrigger value="latency">Content latency</TabsTrigger>
          </TabsList>

          <TabsContent value="adoption">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Adoption scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {adoptionScores.map((metric) => (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{metric.label}</span>
                      <span className="font-medium text-foreground">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI generated highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {aiInsights.map((insight) => (
                  <div key={insight.headline} className="rounded-lg border bg-background p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground">{insight.headline}</h3>
                    <p className="mt-1 text-xs">{insight.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="latency">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Content freshness latency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Average time between knowledge creation and first reuse currently sits at <strong>36 hours</strong>.
                </p>
                <div className="rounded-md border bg-muted/40 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span>Assistant answers referencing stale content</span>
                    <span className="font-medium text-foreground">12%</span>
                  </div>
                  <Progress value={32} className="mt-2 h-2" />
                </div>
                <p>
                  Recommended action: refresh automation collections weekly and promote new templates in assistant suggestions.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-r from-primary/10 via-background to-background">
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Weekly executive report
              </h3>
              <p className="text-sm text-muted-foreground">
                Subscribe executives to the curated insights feed with automated commentary.
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Schedule delivery
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
