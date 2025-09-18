import type { ActivityEvent, Content, ExpertiseProfile } from './types'
import { expHalfLifeDecay } from './decay'

export interface ExpertsParams {
  items: Content[]
  events: ActivityEvent[]
  workspaceId: string
  nowMs?: number
}

// Score authors by engagement on their authored content, per tag.
export function identifyExperts({ items, events, workspaceId, nowMs }: ExpertsParams): ExpertiseProfile[] {
  const now = nowMs ?? Date.now()
  const authored = items.filter((d) => d.workspaceId === workspaceId)

  const byAuthorTag = new Map<string, Map<string, number>>() // authorId -> tagId -> score
  const byAuthorOverall = new Map<string, number>()

  // Index authored docs by id
  const docsById = new Map(authored.map((d) => [d.id, d]))
  const authoredById = new Map<string, string>() // docId -> authorId
  for (const d of authored) authoredById.set(d.id, d.author.id)

  for (const e of events) {
    if (e.workspaceId !== workspaceId) continue
    if (!e.knowledgeId) continue
    const authorId = authoredById.get(e.knowledgeId)
    if (!authorId) continue
    const doc = docsById.get(e.knowledgeId)
    if (!doc) continue

    // Engagement weight: comments/shares > likes > views/clicks
    const w = weightForEvent(e.type) * expHalfLifeDecay(now - e.timestamp, 24 * 14)

    for (const tag of doc.tags) {
      const m = byAuthorTag.get(authorId) ?? new Map<string, number>()
      m.set(tag.id, (m.get(tag.id) ?? 0) + w)
      byAuthorTag.set(authorId, m)
    }
    byAuthorOverall.set(authorId, (byAuthorOverall.get(authorId) ?? 0) + w)
  }

  const profiles: ExpertiseProfile[] = []
  for (const [authorId, tagMap] of byAuthorTag) {
    const topics = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tagId, score]) => ({ tagId, score }))
    profiles.push({ userId: authorId, topics, overall: byAuthorOverall.get(authorId) ?? 0 })
  }

  // Order by overall expertise
  profiles.sort((a, b) => b.overall - a.overall)
  return profiles
}

function weightForEvent(type: ActivityEvent['type']): number {
  switch (type) {
    case 'comment':
      return 5
    case 'share':
      return 6
    case 'like':
      return 3
    case 'save':
      return 4
    case 'view':
    case 'click':
      return 1
    default:
      return 1
  }
}

