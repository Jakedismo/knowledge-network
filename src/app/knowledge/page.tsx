'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResponsiveGrid, GridItem } from '@/components/ui/grid'
import {
  BookOpen,
  Sparkles,
  Folder,
  Tag,
  Star,
  Clock,
  Layers,
  Filter
} from 'lucide-react'

const quickLinks = [
  {
    title: 'Documents',
    description: 'All published and draft knowledge articles',
    href: '/knowledge/documents',
    icon: BookOpen,
    badge: '156 new',
  },
  {
    title: 'Collections',
    description: 'Curated knowledge spaces for teams and projects',
    href: '/knowledge/collections',
    icon: Folder,
  },
  {
    title: 'Templates',
    description: 'Structured starting points for repeatable work',
    href: '/templates',
    icon: Layers,
    badge: '12',
  },
  {
    title: 'Tags & Taxonomy',
    description: 'Manage the shared vocabulary across the organization',
    href: '/knowledge/tags',
    icon: Tag,
  },
]

const spotlightCollections = [
  {
    name: 'AI Strategy Hub',
    description: 'Approved guidance, roadmaps, and launch playbooks for AI initiatives.',
    owner: 'Intelligence Guild',
    lastUpdated: '3 hours ago',
  },
  {
    name: 'Customer Research Library',
    description: 'Interviews, journey maps, and quarterly satisfaction metrics.',
    owner: 'CX Research',
    lastUpdated: 'Yesterday',
  },
]

const taxonomyUpdates = [
  {
    title: 'Added "Process automation" tag',
    detail: 'Linked to Operations and Innovation spaces',
  },
  {
    title: 'Merged duplicate tag "Data governance"',
    detail: 'Consolidated under Governance taxonomy',
  },
  {
    title: 'Collection badges rollout',
    detail: 'Quality grade badges now available across top collections',
  },
]

export default function KnowledgeHomePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
            </div>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Discover, curate, and evolve institutional knowledge. Use the quick links to manage documents, collections, and organizational taxonomy.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/search">
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filters
              </Link>
            </Button>
            <Button asChild>
              <Link href="/editor">
                <Sparkles className="mr-2 h-4 w-4" />
                Create Knowledge
              </Link>
            </Button>
          </div>
        </div>

        <ResponsiveGrid xs={1} md={2} xl={4} gap={6}>
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <GridItem key={link.title}>
                <Card className="h-full border-2 transition-all hover:shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-primary" />
                      {link.title}
                    </CardTitle>
                    {link.badge ? (
                      <Badge variant="secondary">{link.badge}</Badge>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                    <Button variant="ghost" className="px-0" asChild>
                      <Link href={link.href}>Browse {link.title}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </GridItem>
            )
          })}
        </ResponsiveGrid>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-amber-500" />
                Spotlight Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {spotlightCollections.map((collection) => (
                <div
                  key={collection.name}
                  className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4 hover:bg-muted"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{collection.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {collection.description}
                      </p>
                    </div>
                    <Badge variant="outline">{collection.owner}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {collection.lastUpdated}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-primary" />
                Taxonomy Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {taxonomyUpdates.map((item) => (
                <div key={item.title} className="rounded-md border p-3 shadow-sm">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
