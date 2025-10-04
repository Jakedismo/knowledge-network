'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Users,
  Search,
  Layers,
  Zap,
  Activity,
  Clock,
  PlugZap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  cloneDefaultIntegrationState,
} from '@/lib/integrations/default-state'
import { loadIntegrationState } from '@/lib/integrations/storage'
import type { IntegrationStateSnapshot } from '@/lib/integrations/types'

const timeRanges: Array<{ value: '7d' | '30d' | '90d'; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: 'Quarter' },
]

const metricsByRange = {
  '7d': {
    documents: { value: 1284, change: '+12%' },
    activeUsers: { value: 573, change: '+6%' },
    searches: { value: 8200, change: '+18%' },
    sessions: { value: 147, change: '-4%' },
  },
  '30d': {
    documents: { value: 4821, change: '+8%' },
    activeUsers: { value: 2014, change: '+10%' },
    searches: { value: 30120, change: '+22%' },
    sessions: { value: 612, change: '+3%' },
  },
  '90d': {
    documents: { value: 14122, change: '+15%' },
    activeUsers: { value: 5930, change: '+9%' },
    searches: { value: 84210, change: '+31%' },
    sessions: { value: 1765, change: '+5%' },
  },
} as const

const recentDocuments = [
  {
    title: 'Q4 2024 Product Roadmap',
    category: 'Strategy',
    owner: 'Sarah Johnson',
    updated: '2 hours ago',
    status: 'Published',
  },
  {
    title: 'Engineering Best Practices',
    category: 'Engineering',
    owner: 'Mike Chen',
    updated: '5 hours ago',
    status: 'In review',
  },
  {
    title: 'Meeting Notes Template',
    category: 'Templates',
    owner: 'Emily Davis',
    updated: '1 day ago',
    status: 'Published',
  },
  {
    title: 'Customer Insights Digest',
    category: 'Research',
    owner: 'Priya Patel',
    updated: '2 days ago',
    status: 'Draft',
  },
]

const teamActivity = [
  {
    id: 1,
    user: 'Sarah Johnson',
    action: 'published',
    target: 'Q4 2024 Product Roadmap',
    time: '2 minutes ago',
  },
  {
    id: 2,
    user: 'Mike Chen',
    action: 'commented on',
    target: 'Engineering Best Practices',
    time: '15 minutes ago',
  },
  {
    id: 3,
    user: 'Emily Davis',
    action: 'starred',
    target: 'Meeting Notes Template',
    time: '1 hour ago',
  },
  {
    id: 4,
    user: 'Ravi Singh',
    action: 'shared',
    target: 'AI Strategy Hub',
    time: '3 hours ago',
  },
]

const systemAlerts = [
  {
    id: 'alert-1',
    title: 'Mixpanel credentials expired',
    description: 'Reconnect to resume analytics sync.',
    severity: 'warning' as const,
    time: '2 hours ago',
  },
  {
    id: 'alert-2',
    title: 'Teams integration needs attention',
    description: 'OAuth token rejected during scheduled sync.',
    severity: 'critical' as const,
    time: 'Yesterday',
  },
  {
    id: 'alert-3',
    title: 'New template published',
    description: 'Meeting Notes Template is ready for rollout.',
    severity: 'success' as const,
    time: '1 day ago',
  },
]

const quickActions = [
  {
    label: 'Create Document',
    description: 'Start a blank workspace document.',
    href: '/editor',
    icon: FileText,
  },
  {
    label: 'Browse Knowledge',
    description: 'Explore curated collections and templates.',
    href: '/knowledge',
    icon: Layers,
  },
  {
    label: 'Manage Integrations',
    description: 'Connect tools and monitor sync health.',
    href: '/integrations',
    icon: PlugZap,
  },
]

const metricCards = [
  {
    key: 'documents' as const,
    title: 'Total Documents',
    icon: FileText,
  },
  {
    key: 'activeUsers' as const,
    title: 'Active Users',
    icon: Users,
  },
  {
    key: 'searches' as const,
    title: 'Search Queries',
    icon: Search,
  },
  {
    key: 'sessions' as const,
    title: 'Collaboration Sessions',
    icon: Activity,
  },
]

type MetricKey = keyof typeof metricsByRange['7d']

type AlertSeverity = 'warning' | 'critical' | 'success'

const severityStyles: Record<AlertSeverity, string> = {
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const changeBadgeStyles = (change: string) =>
  change.startsWith('-')
    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')
  const [integrationState, setIntegrationState] = useState<IntegrationStateSnapshot>(() =>
    cloneDefaultIntegrationState()
  )

  useEffect(() => {
    setIntegrationState(loadIntegrationState())
  }, [])

  const metrics = metricsByRange[timeRange]

  const integrationSummary = useMemo(() => {
    const connected = integrationState.integrations.filter(integration => integration.status === 'connected').length
    const issues = integrationState.integrations.filter(integration => integration.status === 'error').length
    const now = Date.now()
    const staleThreshold = 1000 * 60 * 60 * 24
    const stale = integrationState.integrations.filter(integration => {
      if (integration.status !== 'connected' || !integration.lastSync) return false
      return now - new Date(integration.lastSync).getTime() > staleThreshold
    }).length
    const activeWebhooks = integrationState.webhooks.filter(webhook => webhook.active).length
    const inactiveWebhooks = integrationState.webhooks.length - activeWebhooks

    return {
      connected,
      issues,
      stale,
      activeWebhooks,
      inactiveWebhooks,
    }
  }, [integrationState])

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Workspace Overview</h1>
            </div>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Monitor the health of your knowledge network, keep integrations connected, and spot the work that needs your
              attention.
            </p>
          </div>
          <div className="flex gap-2">
            {timeRanges.map(range => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map(({ key, title, icon: Icon }) => {
            const metric = metrics[key as MetricKey]
            return (
              <Card key={key} className="border shadow-sm">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary" />
                    <Badge className={cn('text-xs', changeBadgeStyles(metric.change))}>{metric.change}</Badge>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold">{metric.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{title}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Card key={action.label} className="border-dashed hover:border-primary/60 transition-colors">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm font-semibold">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm" className="gap-1">
                    <Link href={action.href}>
                      <Icon className="h-4 w-4" />
                      Go
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Recent Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentDocuments.map(document => (
                <div
                  key={document.title}
                  className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{document.title}</h3>
                      <p className="text-xs text-muted-foreground">Owned by {document.owner}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {document.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{document.category}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {document.updated}
                    </span>
                  </div>
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="self-start">
                <Link href="/knowledge/documents" className="flex items-center gap-2">
                  Browse all documents
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PlugZap className="h-5 w-5 text-primary" />
                Integration Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Connected tools</p>
                  <p className="text-xs text-muted-foreground">Active syncs with recent updates</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {integrationSummary.connected}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Webhooks active</p>
                  <p className="text-xs text-muted-foreground">
                    {integrationSummary.inactiveWebhooks} paused webhook(s)
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {integrationSummary.activeWebhooks} / {integrationSummary.activeWebhooks + integrationSummary.inactiveWebhooks}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Issues to review</p>
                  <p className="text-xs text-muted-foreground">
                    {integrationSummary.stale} stale sync(s) · {integrationSummary.issues} error(s)
                  </p>
                </div>
                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {integrationSummary.issues + integrationSummary.stale}
                </Badge>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/integrations" className="flex items-center justify-center gap-2">
                  Manage integrations
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamActivity.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{item.user}</span> {item.action}{' '}
                      <span className="font-medium">{item.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemAlerts.map(alert => (
                <div key={alert.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{alert.title}</h3>
                    <span className={cn('rounded-full px-2 py-1 text-xs', severityStyles[alert.severity])}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{alert.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {alert.time}
                  </p>
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="flex w-full items-center justify-center gap-2">
                <Link href="/notifications">
                  View all alerts
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
