import type { ActivityEvent, Content, Scored } from './types'
import { buildUserAffinityProfile } from './signals'

export interface GapParams {
  userId: string
  workspaceId: string
  items: Content[]
  events: ActivityEvent[]
  trendingTagIds: string[]
  nowMs?: number
}

// Identify topics the org cares about (trending) where the user has low affinity.
export function identifyKnowledgeGaps({ userId, workspaceId, items, events, trendingTagIds, nowMs }: GapParams): { underexposedTags: Array<{ tagId: string; deficit: number }>; recommendations: Scored<Content>[] } {
  const now = nowMs ?? Date.now()
  const byId = new Map(items.filter((d) => d.workspaceId === workspaceId).map((d) => [d.id, d]))
  const profile = buildUserAffinityProfile(userId, events, byId, now, 24 * 7)

  // Compute deficits per trending tag
  const deficits = new Map<string, number>()
  for (const t of trendingTagIds) {
    const aff = profile.byTag.get(t) ?? 0
    const deficit = Math.max(0, 1 - sigmoid(aff))
    if (deficit > 0) deficits.set(t, deficit)
  }
  const underexposedTags = [...deficits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tagId, deficit]) => ({ tagId, deficit }))

  // Recommend top items covering those tags the user hasn’t engaged with
  const scored = new Map<string, { score: number; reasons: string[] }>()
  for (const doc of byId.values()) {
    let s = 0
    let reasons: string[] = []
    for (const { tagId, deficit } of underexposedTags) {
      if (doc.tags.some((t) => t.id === tagId)) {
        s += 0.8 * deficit
        reasons.push('fills your org-topic gap')
      }
    }
    if (s > 0) scored.set(doc.id, { score: s, reasons })
  }

  const out: Scored<Content>[] = [...scored.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 20)
    .map(([id, { score, reasons }]) => ({ id, score, reasons, payload: byId.get(id)! }))

  return { underexposedTags, recommendations: out }
}

function sigmoid(x: number): number {
  // Stable sigmoid
  if (x >= 0) {
    const z = Math.exp(-x)
    return 1 / (1 + z)
  } else {
    const z = Math.exp(x)
    return z / (1 + z)
  }
}

