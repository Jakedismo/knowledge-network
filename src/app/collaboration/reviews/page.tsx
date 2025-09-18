'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ClipboardCheck,
  ShieldCheck,
  Timer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

const pendingReviews = [
  {
    document: 'AI Ethics Review — ML Scoring',
    owner: 'Compliance',
    reviewers: ['Jamil', 'Sonia'],
    sla: '8h remaining',
    state: 'Pending',
  },
  {
    document: 'Launch Approval — Customer Billing',
    owner: 'Finance Ops',
    reviewers: ['Esther'],
    sla: '3h overdue',
    state: 'Escalated',
  },
  {
    document: 'Incident Postmortem #4589',
    owner: 'Operations',
    reviewers: ['Gabe', 'Kim'],
    sla: '16h remaining',
    state: 'Pending',
  },
]

const completedReviews = [
  {
    document: 'Automation Runbook 2.0',
    owner: 'Automation Guild',
    closed: 'Yesterday',
    outcome: 'Approved',
  },
  {
    document: 'Data Governance Charter',
    owner: 'Data Council',
    closed: 'Mar 11',
    outcome: 'Changes requested',
  },
]

export default function CollaborationReviewsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
            <p className="text-muted-foreground mt-2">
              Track approvals, reviewer assignments, and SLA compliance for critical knowledge assets.
            </p>
          </div>
          <Button variant="outline">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Configure guardrails
          </Button>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Pending approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Reviewers</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReviews.map((review) => (
                      <TableRow key={review.document}>
                        <TableCell className="font-medium">{review.document}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{review.owner}</TableCell>
                        <TableCell className="text-sm">{review.reviewers.join(', ')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{review.sla}</TableCell>
                        <TableCell>
                          <Badge
                            variant={review.state === 'Escalated' ? 'destructive' : 'outline'}
                          >
                            {review.state}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Recently completed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {completedReviews.map((review) => (
                  <div key={review.document} className="rounded-lg border bg-background p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{review.document}</p>
                        <p className="text-xs text-muted-foreground">Owner: {review.owner}</p>
                      </div>
                      <Badge variant="outline">{review.closed}</Badge>
                    </div>
                    <p className="mt-2 text-xs">Outcome: {review.outcome}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sla">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  SLA performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span>Approvals within target</span>
                  <Badge variant="secondary">92%</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span>Average turnaround</span>
                  <Badge variant="outline">11h</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span>Cases escalated</span>
                  <Badge variant="destructive">3</Badge>
                </div>
                <p>
                  Escalations trigger AI summaries and notifications to channel leads for resolution.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-foreground">Best practice</p>
              <p>Pair human approvals with automated checklists to ensure compliance coverage.</p>
            </div>
            <Button variant="secondary" size="sm">
              Share review policy
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
