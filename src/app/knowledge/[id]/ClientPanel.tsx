"use client"
import * as React from 'react'
import { ApolloProvider, useQuery } from '@apollo/client'
import apolloClient from '@/lib/graphql/client'
import { EditorShell } from '@/components/editor/editor-shell'
import { EditorOrganizationApolloPanel } from '@/components/organization/EditorOrganizationApolloPanel'
import { CommentsPanel } from '@/components/comments/CommentsPanel'
import { MentionNotifications } from '@/components/comments/MentionNotifications'
import { GET_KNOWLEDGE } from '@/lib/graphql/queries'

function PanelInner({ id }: { id: string }) {
  const { data } = useQuery(GET_KNOWLEDGE, { variables: { id } })
  const workspaceId = data?.knowledge?.workspace?.id ?? null
  return (
    <>
      <div className="flex items-center justify-end gap-2 p-2">
        <MentionNotifications knowledgeId={id} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px_320px] gap-4 px-4 pb-4">
        <div className="border rounded-md bg-background p-0">
          <EditorShell initialContent={'<h2 id="intro">Introduction</h2><p>Start writing documentation…</p>'} />
        </div>
        <EditorOrganizationApolloPanel knowledgeId={id} />
        <div className="border rounded-md bg-background p-3">
          <CommentsPanel knowledgeId={id} workspaceId={workspaceId} />
        </div>
      </div>
    </>
  )
}

export function ClientPanel({ id }: { id: string }) {
  return (
    <ApolloProvider client={apolloClient}>
      <PanelInner id={id} />
    </ApolloProvider>
  )
}
