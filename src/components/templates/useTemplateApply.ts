export type ApplyTemplateParams = {
  templateId: string
  target: { workspaceId: string; authorId: string; collectionId?: string | null; title?: string }
  values?: Record<string, string | number | boolean | null>
  auth?: { token?: string; userId?: string; workspaceId?: string }
}

export async function applyTemplate({ templateId, target, values, auth }: ApplyTemplateParams) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (auth?.token) headers['authorization'] = `Bearer ${auth.token}`
  if (auth?.userId) headers['x-user-id'] = auth.userId
  if (auth?.workspaceId) headers['x-workspace-id'] = auth.workspaceId
  const res = await fetch(`/api/templates/${templateId}/apply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ target, values }),
  })
  if (!res.ok) throw new Error(`Apply failed: ${res.status}`)
  return (await res.json()) as { id: string; workspaceId: string }
}

