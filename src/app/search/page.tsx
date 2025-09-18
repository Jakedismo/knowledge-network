'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Filter,
  Sparkles,
  Clock,
  TrendingUp,
  History,
  BookMarked,
} from 'lucide-react'

const trendingQueries = [
  'Launch go-live checklist',
  'AI ethics review',
  'Customer journey mapping',
  'Security incident bridge',
]

const savedSearches = [
  {
    name: 'Quarterly launch reviews',
    description: 'Filter by launch readiness tag + review status',
    results: 42,
  },
  {
    name: 'Security tagged documents',
    description: 'Published knowledge with security guild ownership',
    results: 28,
  },
]

const recentResults = [
  {
    title: 'Launch Readiness Review — April 2025',
    snippet: 'Checklist covering readiness gates, approvals, and mitigation plans for Q2 releases.',
    tags: ['Launch', 'Checklist'],
    updated: '4 minutes ago',
  },
  {
    title: 'AI Ethics Decision Log Template',
    snippet: 'Template to capture intention, data handling, and risk assessments for AI features.',
    tags: ['Template', 'AI Strategy'],
    updated: 'Today',
  },
  {
    title: 'Incident Response Playbook 3.2',
    snippet: 'Runbook covering severity matrix, communication protocols, and escalation ladders.',
    tags: ['Security', 'Runbook'],
    updated: 'Yesterday',
  },
]

export default function SearchPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Knowledge Search</h1>
          <p className="text-muted-foreground mt-2">
            Find documents, collections, discussions, and assistant answers with a single query.
          </p>
        </div>

        <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Search className="h-6 w-6 text-primary" />
              Search workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search across knowledge network"
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
                  Cmd + K
                </Button>
              </div>
              <Button variant="outline" className="md:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button className="md:w-auto">
                <Sparkles className="mr-2 h-4 w-4" />
                Ask assistant
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {trendingQueries.map((query) => (
                <Badge key={query} variant="secondary" className="cursor-pointer">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {query}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="saved">Saved searches</TabsTrigger>
            <TabsTrigger value="history">Recent activity</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-primary" />
                  Most relevant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentResults.map((result) => (
                  <div key={result.title} className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">{result.title}</h3>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {result.updated}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{result.snippet}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {result.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Saved search recipes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {savedSearches.map((saved) => (
                  <div key={saved.name} className="rounded-lg border bg-background p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{saved.name}</h3>
                        <p className="text-xs text-muted-foreground">{saved.description}</p>
                      </div>
                      <Badge variant="outline">{saved.results} results</Badge>
                    </div>
                    <Button size="sm" variant="ghost" className="mt-3 px-0">
                      Run search
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Search history
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[320px] pr-4">
                  <div className="space-y-3">
                    {['Risk review workflow', 'Automation playbooks', 'Customer VOC template', 'Incident drill runbook'].map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                        <span className="text-sm">{item}</span>
                        <span className="text-xs text-muted-foreground">Viewed 2d ago</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />
        <div className="grid gap-4 text-xs text-muted-foreground md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Federated sources</h3>
            <p>Documents, templates, meeting notes, analytics boards, and agent answers.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Signals</h3>
            <p>Ranking by freshness, usage, taxonomy relevance, and AI generated summaries.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Shortcuts</h3>
            <p>Press Cmd+K anywhere to launch quick search. Cmd+Shift+F to open advanced filters.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
