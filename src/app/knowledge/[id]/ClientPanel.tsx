"use client"
import * as React from 'react'
import { ApolloProvider } from '@apollo/client'
import apolloClient from '@/lib/graphql/client'
import { EditorShell } from '@/components/editor/editor-shell'
import { EditorOrganizationApolloPanel } from '@/components/organization/EditorOrganizationApolloPanel'

export function ClientPanel({ id }: { id: string }) {
  return (
    <ApolloProvider client={apolloClient}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4 p-4">
        <div className="border rounded-md bg-background p-0">
          <EditorShell initialContent={'<p>Start writing documentation…</p>'} />
        </div>
        <EditorOrganizationApolloPanel knowledgeId={id} />
      </div>
    </ApolloProvider>
  )
}

