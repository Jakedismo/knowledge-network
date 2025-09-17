import type { CollaborationWsToken } from '@/lib/collaboration/types'

export async function getWsToken(knowledgeId: string, abort?: AbortSignal): Promise<CollaborationWsToken> {
  const res = await fetch('/api/collab/ws-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: typeof window !== 'undefined' ? `Bearer ${localStorage.getItem('auth-token') ?? ''}` : '',
    },
    body: JSON.stringify({ knowledgeId }),
    signal: abort,
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(err?.error ?? 'Failed to get collaboration token')
  }
  const json = (await res.json()) as CollaborationWsToken
  return json
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
