"use client"
import { useMemo } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { GET_MY_WORKSPACES, GET_WORKSPACE } from '@/lib/graphql/queries'
import { MOVE_COLLECTION } from '@/lib/graphql/mutations'
import type { TreeNode } from '@/components/organization/types'

export function useMyWorkspaces() {
  const { data, loading, error } = useQuery(GET_MY_WORKSPACES, { fetchPolicy: 'cache-first' })
  const workspaces = useMemo(() => {
    return (data?.myWorkspaces ?? []).map((w: any) => ({ id: w.id, name: w.name, slug: w.id }))
  }, [data])
  return { workspaces, loading, error }
}

function mapCollectionsToTree(collections: any[] | undefined): TreeNode[] {
  return (collections ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    isExpanded: true,
    isSelected: false,
    children: mapCollectionsToTree(c.children ?? []),
  }))
}

export function useWorkspaceTree(workspaceId?: string) {
  const skip = !workspaceId
  const { data, loading, error, refetch } = useQuery(GET_WORKSPACE, { variables: { id: workspaceId }, skip })
  const tree = useMemo(() => mapCollectionsToTree(data?.workspace?.collections ?? []), [data])
  const tags = useMemo(() => (data?.workspace?.tags ?? []).map((t: any) => ({ id: t.id, label: t.name })), [data])
  return { tree, tags, loading, error, refetch }
}

export function useMoveCollection() {
  const [mutate, state] = useMutation(MOVE_COLLECTION)
  async function move(id: string, parentId: string | null) {
    await mutate({ variables: { id, parentId } })
  }
  return { move, ...state }
}

