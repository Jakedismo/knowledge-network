"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ScoredDocument {
  id: string
  score: number
  reasons?: string[]
  payload: {
    id: string
    title: string
    excerpt?: string | null
    content?: string
    workspaceId: string
  }
}

interface PersonalizedResponse {
  items: ScoredDocument[]
}

interface TrendingResponse {
  topics: Array<{ key: string; score: number; volume: number; delta: number }>
  items: ScoredDocument[]
}

interface GapsResponse {
  underexposedTags: Array<{ tagId: string; deficit: number }>
  recommendations: ScoredDocument[]
}

interface ExpertsResponse {
  experts: Array<{ userId: string; overall: number; topics: Array<{ tagId: string; score: number }> }>
}

interface DuplicatesResponse {
  duplicates: Array<{ representativeId: string; memberIds: string[]; similarity: number }>
}

interface WidgetState {
  personalized: PersonalizedResponse | null
  trending: TrendingResponse | null
  gaps: GapsResponse | null
  experts: ExpertsResponse | null
  duplicates: DuplicatesResponse | null
}

const initialState: WidgetState = {
  personalized: null,
  trending: null,
  gaps: null,
  experts: null,
  duplicates: null,
}

export function RecommendationsWidget() {
  const auth = useAuth()
  const [state, setState] = useState<WidgetState>(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workspaceId = useMemo(() => {
    return auth.getCurrentWorkspace?.() ?? (auth.user as any)?.workspaceId ?? null
  }, [auth])

  const accessToken = auth.accessToken

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setError('Sign in to view personalized recommendations.')
      return
    }
    if (!workspaceId) {
      setError('Select a workspace to load recommendations.')
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    try {
      const [personalized, trending, gaps, experts, duplicates] = await Promise.all([
        fetchJson<PersonalizedResponse>(`/api/recommendations/personalized`, { workspace: workspaceId, limit: '5' }, accessToken, controller.signal),
        fetchJson<TrendingResponse>(`/api/recommendations/trending`, { workspace: workspaceId }, accessToken, controller.signal),
        fetchJson<GapsResponse>(`/api/recommendations/gaps`, { workspace: workspaceId }, accessToken, controller.signal),
        fetchJson<ExpertsResponse>(`/api/recommendations/experts`, { workspace: workspaceId }, accessToken, controller.signal),
        fetchJson<DuplicatesResponse>(`/api/recommendations/duplicates`, { workspace: workspaceId }, accessToken, controller.signal),
      ])

      setState({ personalized, trending, gaps, experts, duplicates })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message ?? 'Failed to load recommendations.')
        setState(initialState)
      }
    } finally {
      setLoading(false)
    }

    return () => controller.abort()
  }, [accessToken, workspaceId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in to access personalized recommendations.</p>
  }

  if (!workspaceId) {
    return <p className="text-sm text-muted-foreground">Select a workspace to view recommendations.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Smart Recommendations</h1>
          <p className="text-sm text-muted-foreground">Signals sourced from workspace activity and knowledge graph.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <section aria-labelledby="personalized-heading" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle id="personalized-heading">For you</CardTitle>
          </CardHeader>
          <CardContent>
            <RecommendationList items={state.personalized?.items ?? []} loading={loading} emptyMessage="No personalized items yet." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trending topics</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendingTopics topics={state.trending?.topics ?? []} loading={loading} />
            <div className="mt-4 space-y-3">
              <RecommendationList items={state.trending?.items?.slice(0, 5) ?? []} loading={loading} emptyMessage="No trending documents yet." />
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
            <GapBadges tags={state.gaps?.underexposedTags ?? []} loading={loading} />
            <div className="mt-4">
              <RecommendationList items={state.gaps?.recommendations.slice(0, 5) ?? []} loading={loading} emptyMessage="No gap-filling items yet." />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Experts in workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpertsList experts={state.experts?.experts ?? []} loading={loading} />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="duplicates-heading">
        <Card>
          <CardHeader>
            <CardTitle id="duplicates-heading">Potential duplicates</CardTitle>
          </CardHeader>
          <CardContent>
            <DuplicateList duplicates={state.duplicates?.duplicates ?? []} loading={loading} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

async function fetchJson<T>(path: string, params: Record<string, string>, token: string, signal: AbortSignal): Promise<T> {
  const search = new URLSearchParams(params)
  const response = await fetch(`${path}?${search.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  return response.json() as Promise<T>
}

function RecommendationList({ items, loading, emptyMessage }: { items: ScoredDocument[]; loading: boolean; emptyMessage: string }) {
  if (loading && !items.length) {
    return <SkeletonRows count={3} />
  }
  if (!items.length) {
    return <EmptyState message={emptyMessage} />
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

function TrendingTopics({ topics, loading }: { topics: TrendingResponse['topics']; loading: boolean }) {
  if (loading && !topics.length) {
    return <SkeletonBadges count={4} />
  }
  if (!topics.length) {
    return <EmptyState message="No trending signals yet." />
  }
  return (
    <div className="flex flex-wrap gap-2" aria-live="polite">
      {topics.map((topic) => (
        <Badge key={topic.key} variant="secondary" className="capitalize">
          {topic.key.replace('doc:', 'Document ')}
          <span className="ml-2 text-xs text-muted-foreground">{topic.volume} hits</span>
        </Badge>
      ))}
    </div>
  )
}

function GapBadges({ tags, loading }: { tags: Array<{ tagId: string; deficit: number }>; loading: boolean }) {
  if (loading && !tags.length) {
    return <SkeletonBadges count={4} />
  }
  if (!tags.length) {
    return <EmptyState message="No knowledge gaps detected." />
  }
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag.tagId} variant="outline">
          {tag.tagId} · gap {(tag.deficit * 100).toFixed(0)}%
        </Badge>
      ))}
    </div>
  )
}

function ExpertsList({ experts, loading }: { experts: ExpertsResponse['experts']; loading: boolean }) {
  if (loading && !experts.length) {
    return <SkeletonRows count={3} />
  }
  if (!experts.length) {
    return <EmptyState message="No expert signals yet." />
  }
  return (
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
  )
}

function DuplicateList({ duplicates, loading }: { duplicates: DuplicatesResponse['duplicates']; loading: boolean }) {
  if (loading && !duplicates.length) {
    return <SkeletonRows count={2} />
  }
  if (!duplicates.length) {
    return <EmptyState message="No duplicates detected." />
  }
  return (
    <ul className="space-y-3">
      {duplicates.map((cluster) => (
        <li key={cluster.representativeId} className="rounded-md border border-border p-3">
          <div className="font-medium">Primary: {cluster.representativeId}</div>
          <div className="text-sm text-muted-foreground">Similarity {(cluster.similarity * 100).toFixed(1)}%</div>
          <div className="mt-2 text-sm">Members: {cluster.memberIds.join(', ')}</div>
        </li>
      ))}
    </ul>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground" role="status">{message}</p>
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-12 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  )
}

function SkeletonBadges({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-6 w-20 animate-pulse rounded-full bg-muted" />
      ))}
    </div>
  )
}

