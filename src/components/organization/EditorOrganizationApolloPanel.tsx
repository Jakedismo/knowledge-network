"use client"
import * as React from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { GET_KNOWLEDGE, GET_WORKSPACE } from '@/lib/graphql/queries'
import { CREATE_TAG, MOVE_COLLECTION, REORDER_COLLECTIONS, UPDATE_COLLECTION, UPDATE_KNOWLEDGE } from '@/lib/graphql/mutations'
import { EditorOrganizationPanel } from './EditorOrganizationPanel'
import type { MetadataFieldDefinition, TagOption, TreeMoveEvent, TreeNode, WorkspaceOption } from './types'
import { getSchemaFieldsForKnowledge } from '@/lib/metadata/registry'
import { listMetadataSchemas } from '@/lib/org/client'

function mapCollectionsToTree(collections: any[] | undefined, selectedId?: string): TreeNode[] {
  return (collections ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    isExpanded: true,
    isSelected: c.id === selectedId,
    children: mapCollectionsToTree(c.children ?? [], selectedId),
  }))
}

function buildParentIndex(nodes: any[], parentId: string | null = null, out: Record<string, string | null> = {}): Record<string, string | null> {
  for (const n of nodes) {
    out[n.id] = parentId
    if (n.children?.length) buildParentIndex(n.children, n.id, out)
  }
  return out
}

export interface EditorOrganizationApolloPanelProps {
  knowledgeId: string
}

export function EditorOrganizationApolloPanel({ knowledgeId }: EditorOrganizationApolloPanelProps) {
  const { data: kData } = useQuery(GET_KNOWLEDGE, { variables: { id: knowledgeId } })
  const workspaceId: string | undefined = kData?.knowledge?.workspace?.id
  const collectionId: string | undefined = kData?.knowledge?.collection?.id
  const currentTags: TagOption[] = (kData?.knowledge?.tags ?? []).map((t: any) => ({ id: t.tag.id, label: t.tag.name }))
  const metadataValues = kData?.knowledge?.metadata ?? {}

  const { data: wsData, refetch } = useQuery(GET_WORKSPACE, { variables: { id: workspaceId }, skip: !workspaceId })
  const collections = wsData?.workspace?.collections ?? []
  const parentIndex = React.useMemo(() => buildParentIndex(collections), [collections])
  const tree: TreeNode[] = React.useMemo(() => mapCollectionsToTree(collections, collectionId), [collections, collectionId])
  const tagSuggestions: TagOption[] = React.useMemo(() => (wsData?.workspace?.tags ?? []).map((t: any) => ({ id: t.id, label: t.name, color: t.color ?? undefined })), [wsData])

  const [updateKnowledge] = useMutation(UPDATE_KNOWLEDGE)
  const [moveCollection] = useMutation(MOVE_COLLECTION)
  const [updateCollection] = useMutation(UPDATE_COLLECTION)
  const [reorderCollections] = useMutation(REORDER_COLLECTIONS)

  // Simple metadata field registry – could be fetched from server later
  const knowledgeKind: string | undefined = kData?.knowledge?.templateId ? 'spec' : 'doc'
  const [remoteFields, setRemoteFields] = React.useState<MetadataFieldDefinition[] | null>(null)
  React.useEffect(() => {
    async function fetchSchemas() {
      if (!workspaceId) return
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') ?? '' : ''
        const schemas = await listMetadataSchemas(token, workspaceId)
        const filtered = schemas.filter((s) => s.knowledgeType === (knowledgeKind ?? 'doc'))
        if (filtered.length) {
          const latest = filtered[filtered.length - 1]
          const fields = jsonToFields(latest.zodJson)
          if (fields.length) setRemoteFields(fields)
        }
      } catch {
        // ignore and fallback
      }
    }
    fetchSchemas()
  }, [workspaceId, knowledgeKind])
  const metadataFields: MetadataFieldDefinition[] = React.useMemo(() => remoteFields ?? getSchemaFieldsForKnowledge(knowledgeKind), [remoteFields, knowledgeKind])

  const [createTag] = useMutation(CREATE_TAG)
  async function handleTagsChange(next: TagOption[]) {
    // Ensure all tags exist; create missing ones by label
    const existingById = new Map((wsData?.workspace?.tags ?? []).map((t: any) => [t.id, t]))
    const nextEnsured: string[] = []
    for (const tag of next) {
      if (!existingById.has(tag.id)) {
        // Create by label under this workspace
        const res = await createTag({ variables: { input: { name: tag.label, workspaceId, color: tag.color } } })
        const newId = res.data?.createTag?.id
        if (newId) nextEnsured.push(newId)
      } else {
        nextEnsured.push(tag.id)
      }
    }
    await updateKnowledge({ variables: { id: knowledgeId, input: { tagIds: nextEnsured } } })
  }

  async function handleMetadataChange(values: Record<string, unknown>) {
    await updateKnowledge({ variables: { id: knowledgeId, input: { metadata: values } } })
  }

  async function onTreeMove(e: TreeMoveEvent) {
    // Compute parent based on position: inside -> target, before/after -> parent of target
    const targetParent = e.position === 'inside' ? e.targetId : (parentIndex[e.targetId] ?? null)
    await moveCollection({ variables: { id: e.sourceId, parentId: targetParent } })

    if (e.position !== 'inside') {
      const siblings = findSiblings(collections, targetParent)
      const ordered = reorderList(siblings, e.sourceId, e.targetId, e.position)
      // Try bulk reorder; fall back to per-item updates if not supported
      try {
        await (REORDER_COLLECTIONS && workspaceId ? updateCollectionOrdersBulk(workspaceId, ordered) : Promise.reject('no-bulk'))
      } catch {
        for (let i = 0; i < ordered.length; i++) {
          await updateCollection({ variables: { id: ordered[i]!.id, input: { sortOrder: i } } })
        }
      }
    }
    await refetch()
  }

  function findSiblings(nodes: any[], parentId: string | null) {
    if (!parentId) return nodes
    for (const n of nodes) {
      if (n.id === parentId) return n.children ?? []
      const r = findSiblings(n.children ?? [], parentId)
      if (r) return r
    }
    return []
  }

  function reorderList(list: any[], movingId: string, targetId: string, pos: 'before'|'after'|'inside') {
    const inside = pos === 'inside'
    const arr = [...list]
    const movingIdx = arr.findIndex(x => x.id === movingId)
    const targetIdx = arr.findIndex(x => x.id === targetId)
    if (movingIdx >= 0) arr.splice(movingIdx, 1)
    const insertAt = inside ? arr.length : (pos === 'before' ? targetIdx : targetIdx + 1)
    arr.splice(Math.max(0, insertAt), 0, list.find(x => x.id === movingId))
    return arr.filter(Boolean)
  }

  async function updateCollectionOrdersBulk(wsId: string, ordered: any[]) {
    const orders = ordered.map((n, i) => ({ id: n.id, sortOrder: i }))
    return await reorderCollections({ variables: { workspaceId: wsId, orders } })
  }

  const workspaces: WorkspaceOption[] = React.useMemo(() => (wsData ? [{ id: wsData.workspace.id, name: wsData.workspace.name }] : []), [wsData])

  if (!workspaceId) return null

  return (
    <EditorOrganizationPanel
      workspaces={workspaces}
      currentWorkspaceId={workspaceId}
      onSwitchWorkspace={() => { /* Switch not implemented in this container */ }}
      tree={tree}
      onTreeMove={onTreeMove}
      breadcrumbs={[{ label: wsData?.workspace?.name ?? 'Workspace' }]}
      tags={currentTags}
      onTagsChange={handleTagsChange}
      tagSuggestions={tagSuggestions}
      metadataFields={metadataFields}
      metadataValues={metadataValues}
      onMetadataChange={handleMetadataChange}
    />
  )
}

function jsonToFields(zodJson: any): MetadataFieldDefinition[] {
  // Expected format (optional) { fields: [{ name,label,type,required,options? }] }
  // Graceful fallback: no fields if not matching
  if (zodJson && Array.isArray(zodJson.fields)) {
    return zodJson.fields
      .filter((f: any) => typeof f?.name === 'string' && typeof f?.type === 'string')
      .map((f: any) => ({
        name: f.name,
        label: f.label ?? f.name,
        type: f.type,
        required: !!f.required,
        placeholder: f.placeholder,
        description: f.description,
        options: Array.isArray(f.options) ? f.options.map((o: any) => ({ label: String(o.label ?? o.value), value: String(o.value) })) : undefined,
      }))
  }
  return []
}
