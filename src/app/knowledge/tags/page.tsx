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
  Tag,
  Sparkles,
  RefreshCw,
  Upload,
  Filter,
  Wand2,
} from 'lucide-react'

const coreTaxonomy = [
  { label: 'AI Strategy', usage: 214 },
  { label: 'Compliance', usage: 162 },
  { label: 'Customer Insights', usage: 189 },
  { label: 'Enablement', usage: 121 },
  { label: 'Launch Readiness', usage: 147 },
  { label: 'Operations', usage: 205 },
]

const aiSuggestions = [
  {
    label: 'Retrospective Insights',
    confidence: 0.92,
    rationale: 'Detected recurring topic clusters in post-mortem documents.',
  },
  {
    label: 'Partner Enablement',
    confidence: 0.87,
    rationale: 'High activity in collections and search queries containing "partner".',
  },
  {
    label: 'Workflow Automation',
    confidence: 0.81,
    rationale: 'Emerging trend in collaboration sessions with automation guild.',
  },
]

export default function KnowledgeTagsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tags & Taxonomy</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Govern the shared vocabulary of the Knowledge Network. Balance curated taxonomy with AI-assisted discovery.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import mapping
            </Button>
            <Button>
              <Tag className="mr-2 h-4 w-4" />
              Create tag
            </Button>
          </div>
        </div>

        <Tabs defaultValue="taxonomy">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
            <TabsTrigger value="suggestions">AI suggestions</TabsTrigger>
            <TabsTrigger value="automation">Automation rules</TabsTrigger>
          </TabsList>

          <TabsContent value="taxonomy" className="mt-6">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    placeholder="Search tags"
                    className="w-full max-w-xs"
                  />
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Taxonomy API
                  </Button>
                </div>
                <Separator />
                <ScrollArea className="max-h-[360px] pr-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {coreTaxonomy.map((tag) => (
                      <div
                        key={tag.label}
                        className="rounded-lg border bg-muted/40 p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-sm">
                            {tag.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tag.usage} uses
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-6">
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI generated suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.label}
                    className="rounded-lg border bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge>{suggestion.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Confidence {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary">
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {suggestion.rationale}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Automation rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Configure automatic tag suggestions and governance rules to keep content aligned and findable.
                </p>
                <ul className="space-y-2 text-xs">
                  <li>• Auto-suggest tags from document headings and summary.</li>
                  <li>• Flag content without mandatory compliance tags.</li>
                  <li>• Watch search queries to propose new taxonomy nodes.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
