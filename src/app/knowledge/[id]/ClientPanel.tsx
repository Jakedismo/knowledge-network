"use client"
import * as React from 'react'
import { ApolloProvider, useQuery } from '@apollo/client'
import apolloClient from '@/lib/graphql/client'
import { EditorShell } from '@/components/editor/editor-shell'
import { EditorOrganizationApolloPanel } from '@/components/organization/EditorOrganizationApolloPanel'
import { CommentsPanel } from '@/components/comments/CommentsPanel'
import { MentionNotifications } from '@/components/comments/MentionNotifications'
import { GET_KNOWLEDGE } from '@/lib/graphql/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

function SkeletonTextBlock({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} height={16} width={index === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

function DocumentSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="rounded-md border bg-background p-4">
        <Skeleton width="45%" height={28} className="mb-2" />
        <SkeletonTextBlock lines={4} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px_320px]">
        <Skeleton height={320} className="rounded-md border" />
        <Skeleton height={320} className="rounded-md border" />
        <Skeleton height={320} className="rounded-md border" />
      </div>
    </div>
  )
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return 'just now'
  try {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    }
  } catch {
    // ignore and fall back to raw value
  }
  return value ?? 'just now'
}

function PanelInner({ id }: { id: string }) {
  const { data, loading, error } = useQuery(GET_KNOWLEDGE, { variables: { id } })

  if (loading) {
    return <DocumentSkeleton />
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Unable to load document</AlertTitle>
          <AlertDescription>
            {error.message || 'The document service returned an unexpected error. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const knowledge = data?.knowledge

  if (!knowledge) {
    return (
      <div className="px-4 py-6">
        <Alert variant="warning" className="max-w-xl">
          <AlertTitle>Document not found</AlertTitle>
          <AlertDescription>
            The requested knowledge record was not returned by the API. It may have been removed or access is restricted.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const workspaceId = knowledge.workspace?.id ?? null
  const resolvedHtml = knowledge.content && knowledge.content.trim().length > 0
    ? knowledge.content
    : '<p class="text-muted-foreground">This document does not have any content yet.</p>'

  return (
    <div className="space-y-4 pb-4">
      <header className="border-b bg-background/80 px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {knowledge.title?.trim() || 'Untitled document'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated {formatUpdatedAt(knowledge.updatedAt)}
            </p>
          </div>
          <MentionNotifications knowledgeId={id} />
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-[1fr_320px_320px]">
        <div className="rounded-md border bg-background">
          <EditorShell key={knowledge.id} initialContent={resolvedHtml} />
        </div>
        <EditorOrganizationApolloPanel knowledgeId={id} />
        <div className="rounded-md border bg-background p-3">
          <CommentsPanel knowledgeId={id} workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  )
}

export function ClientPanel({ id }: { id: string }) {
  return (
    <ApolloProvider client={apolloClient}>
      <PanelInner id={id} />
    </ApolloProvider>
  )
}
