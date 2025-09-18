import { Metadata } from 'next'
import { getRecommendationService, getDemoWorkspaceId } from '@/server/modules/recommendations/registry'
import type { RecommendationService } from '@/server/modules/recommendations/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Recommendations Overview',
  description: 'Smart discovery snapshots for the Knowledge Network',
}

const DEMO_USER_ID = 'u_me'

export default async function RecommendationsPage() {
  const workspaceId = getDemoWorkspaceId()
  const service = getRecommendationService()

  const [personalized, trending, gaps, experts, duplicates] = await Promise.all([
    service.personalized({ userId: DEMO_USER_ID, workspaceId, options: { maxResults: 5 } }),
    service.trending(workspaceId),
    service.knowledgeGaps(DEMO_USER_ID, workspaceId),
    service.experts(workspaceId),
    service.duplicates(workspaceId),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Smart Recommendations</h1>
      <section aria-labelledby="personalized-heading" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle id="personalized-heading">For you</CardTitle>
          </CardHeader>
          <CardContent>{personalized.length ? <RecommendationList items={personalized} /> : <EmptyState message="No personalized items yet" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trending topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" aria-live="polite">
              {trending.topics.length ? trending.topics.map((topic) => (
                <Badge key={topic.key} variant="secondary" className="capitalize">
                  {topic.key.replace('doc:', 'Document ')}
                  <span className="ml-2 text-xs text-muted-foreground">{topic.volume} hits</span>
                </Badge>
              )) : <EmptyState message="No trending signals yet" />}
            </div>
            <div className="mt-4 space-y-3">
              {trending.items.slice(0, 5).map((item) => (
                <article key={item.id} className="rounded-md border border-border p-3" aria-label={item.payload.title}>
                  <h3 className="font-medium">{item.payload.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.payload.excerpt ?? item.payload.content.slice(0, 120)}</p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="gaps-experts" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle id="gaps-experts">Mind the gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gaps.underexposedTags.length ? gaps.underexposedTags.map((tag) => (
                <Badge key={tag.tagId} variant="outline">{tag.tagId} · gap {(tag.deficit * 100).toFixed(0)}%</Badge>
              )) : <EmptyState message="No knowledge gaps detected" />}
            </div>
            <div className="mt-4">
              <RecommendationList items={gaps.recommendations.slice(0, 5)} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Experts in workspace</CardTitle>
          </CardHeader>
          <CardContent>
            {experts.length ? (
              <ul className="space-y-3">
                {experts.slice(0, 5).map((expert) => (
                  <li key={expert.userId} className="rounded-md border border-border p-3">
                    <div className="font-medium">{expert.userId}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {expert.topics.slice(0, 4).map((topic) => (
                        <Badge key={topic.tagId} variant="secondary">
                          {topic.tagId}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No expert signals yet" />
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="duplicates-heading">
        <Card>
          <CardHeader>
            <CardTitle id="duplicates-heading">Potential duplicates</CardTitle>
          </CardHeader>
          <CardContent>
            {duplicates.length ? (
              <ul className="space-y-3">
                {duplicates.map((cluster) => (
                  <li key={cluster.representativeId} className="rounded-md border border-border p-3">
                    <div className="font-medium">Primary: {cluster.representativeId}</div>
                    <div className="text-sm text-muted-foreground">Similarity {(cluster.similarity * 100).toFixed(1)}%</div>
                    <div className="mt-2 text-sm">
                      Members: {cluster.memberIds.join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No duplicates detected" />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

type RecommendationItem = Awaited<ReturnType<RecommendationService['personalized']>>[number]

function RecommendationList({ items }: { items: RecommendationItem[] }) {
  if (!items.length) {
    return <EmptyState message="No items to show" />
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border border-border p-3">
          <div className="font-medium" aria-label={item.payload.title}>{item.payload.title}</div>
          {item.reasons?.length ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.reasons.join(' · ')}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground" role="status">{message}</p>
}
