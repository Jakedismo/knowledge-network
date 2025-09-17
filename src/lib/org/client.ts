// Lightweight client helpers for Organization APIs (browser-safe)
import type { CollectionNode, KnowledgeMetadataSchema, Tag, Workspace } from './types'

export async function fetchWorkspaces(token: string): Promise<Workspace[]> {
  const res = await fetch('/api/org/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch workspaces')
  const json = await res.json()
  return json.data as Workspace[]
}

export async function getCollections(workspaceId: string, token: string): Promise<CollectionNode[]> {
  const res = await fetch(`/api/org/collections?workspaceId=${encodeURIComponent(workspaceId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch collections')
  const json = await res.json()
  return json.data as CollectionNode[]
}

export async function createCollection(
  token: string,
  input: { workspaceId: string; name: string; parentId?: string; description?: string },
): Promise<CollectionNode> {
  const res = await fetch('/api/org/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to create collection')
  const json = await res.json()
  return json.data as CollectionNode
}

export async function moveCollection(
  token: string,
  input: { workspaceId: string; id: string; newParentId: string | null },
): Promise<void> {
  const res = await fetch('/api/org/collections/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to move collection')
}

export async function reorderCollection(
  token: string,
  input: { workspaceId: string; id: string; newSortOrder: number },
): Promise<void> {
  const res = await fetch('/api/org/collections/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to reorder collection')
}

export async function suggestTags(token: string, workspaceId: string, q: string): Promise<Tag[]> {
  const res = await fetch(`/api/org/tags/suggest?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch tag suggestions')
  const json = await res.json()
  return json.data as Tag[]
}

export async function upsertTag(token: string, input: { workspaceId: string; name: string; color?: string }): Promise<Tag> {
  const res = await fetch('/api/org/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to upsert tag')
  const json = await res.json()
  return json.data as Tag
}

export async function listMetadataSchemas(token: string, workspaceId: string): Promise<KnowledgeMetadataSchema[]> {
  const res = await fetch(`/api/org/metadata/schemas?workspaceId=${encodeURIComponent(workspaceId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to list metadata schemas')
  const json = await res.json()
  return json.data as KnowledgeMetadataSchema[]
}

export async function registerMetadataSchema(
  token: string,
  input: Omit<KnowledgeMetadataSchema, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<KnowledgeMetadataSchema> {
  const res = await fetch('/api/org/metadata/schemas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to register metadata schema')
  const json = await res.json()
  return json.data as KnowledgeMetadataSchema
}

