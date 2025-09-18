'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Search, Filter, Plus, ExternalLink } from 'lucide-react'

const documents = [
  {
    name: 'AI Operating Model Playbook',
    owner: 'Innovation Office',
    updated: '2 hours ago',
    status: 'Published',
    tags: ['AI Strategy', 'Policy'],
  },
  {
    name: 'Incident Response Checklist',
    owner: 'Security Guild',
    updated: 'Yesterday',
    status: 'Draft',
    tags: ['Security', 'Operations'],
  },
  {
    name: 'Sales Discovery Template',
    owner: 'Revenue Enablement',
    updated: 'Mar 11, 2025',
    status: 'Published',
    tags: ['Template', 'Sales'],
  },
  {
    name: 'Data Governance Charter',
    owner: 'Data Council',
    updated: 'Mar 10, 2025',
    status: 'Review',
    tags: ['Governance', 'Compliance'],
  },
]

const workstreams = [
  {
    title: 'Launch Readiness',
    description: 'Critical SOPs and playbooks required for launch approvals.',
    items: 18,
  },
  {
    title: 'Customer Journeys',
    description: 'Journey maps and insight summaries curated by CX research.',
    items: 26,
  },
  {
    title: 'Engineering Reference',
    description: 'Architecture decisions, runbooks, and troubleshooting guides.',
    items: 31,
  },
]

export default function KnowledgeDocumentsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground mt-2">
              Browse curated knowledge artifacts with filters for status, owner, and taxonomy.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/templates"
              className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
            >
              <ExternalLink className="h-4 w-4" />
              Use Template
            </Link>
            <Link
              href="/editor"
              className={cn(buttonVariants(), 'gap-2')}
            >
              <Plus className="h-4 w-4" />
              New Document
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 sm:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search documents, owners, or tags"
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="ghost">Saved Views</Button>
            </div>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="reviews">In Review</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-6">
                <ScrollArea className="max-h-[420px] pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.name}>
                          <TableCell>
                            <Link
                              href={`/knowledge/${encodeURIComponent(doc.name.toLowerCase().replace(/\s+/g, '-'))}`}
                              className="font-medium hover:underline"
                            >
                              {doc.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{doc.owner}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                doc.status === 'Published'
                                  ? 'default'
                                  : doc.status === 'Draft'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-2 whitespace-nowrap">
                            {doc.tags.map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {doc.updated}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workstreams.map((stream) => (
            <Card key={stream.title} className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">{stream.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{stream.description}</p>
                <p className="text-xs uppercase tracking-wide text-foreground">
                  {stream.items} linked artifacts
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
