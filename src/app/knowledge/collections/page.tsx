'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FolderKanban,
  Users,
  ShieldCheck,
  Layers,
  Plus,
  ArrowRight,
} from 'lucide-react'

const collections = [
  {
    name: 'Product Launch Control Center',
    description: 'Operational runbooks, launch gates, and readiness checklists for cross-functional releases.',
    owner: 'LaunchPMO',
    health: 86,
    members: 48,
    badges: ['Key Initiative', 'Auto-curated'],
  },
  {
    name: 'Learning & Onboarding Academy',
    description: 'Role-specific onboarding paths, training resources, and certification tracks.',
    owner: 'People Ops',
    health: 72,
    members: 193,
    badges: ['Evergreen'],
  },
  {
    name: 'Operations Excellence',
    description: 'Process improvements, retrospectives, and automation best practices.',
    owner: 'Operations Guild',
    health: 91,
    members: 67,
    badges: ['Featured'],
  },
  {
    name: 'Customer Stories',
    description: 'Case studies, reference decks, and testimonial library sorted by segment.',
    owner: 'Marketing',
    health: 64,
    members: 112,
    badges: ['Storytelling'],
  },
]

const curationEvents = [
  {
    title: 'Weekly freshness check',
    note: 'AI flagged 5 documents for review in Operations Excellence.',
  },
  {
    title: 'New collection request',
    note: 'Revenue Ops proposed "Partner Enablement" workspace.',
  },
  {
    title: 'Template uplift',
    note: 'Launch Control Center adopted new decision log template.',
  },
]

export default function KnowledgeCollectionsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Curated knowledge spaces with guardrails for quality, ownership, and discoverability.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Layers className="mr-2 h-4 w-4" />
              Manage badges
            </Button>
            <Button asChild>
              <Link href="/editor">
                <Plus className="mr-2 h-4 w-4" />
                New collection draft
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.name} className="flex h-full flex-col border-2">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderKanban className="h-5 w-5 text-primary" />
                  {collection.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              </CardHeader>
              <CardContent className="mt-auto space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  {collection.badges.map((badge) => (
                    <Badge key={badge} variant="outline">
                      {badge}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Health
                  </span>
                  <Progress value={collection.health} className="h-2 flex-1" />
                  <span>{collection.health}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {collection.members} members
                  </span>
                  <Button variant="ghost" size="sm" className="px-2" asChild>
                    <Link href={`/knowledge/${encodeURIComponent(collection.name.toLowerCase().replace(/\s+/g, '-'))}`}>
                      View space
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              Curation activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[220px] pr-4">
              <div className="space-y-3">
                {curationEvents.map((event) => (
                  <div key={event.title} className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.note}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
