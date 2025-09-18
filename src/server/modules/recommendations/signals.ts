import type { ActivityEvent, Content } from './types'
import { expHalfLifeDecay } from './decay'

const DEFAULT_EVENT_WEIGHTS: Record<ActivityEvent['type'], number> = {
  view: 1,
  like: 3,
  save: 4,
  comment: 5,
  share: 6,
  click: 1,
  followAuthor: 3,
  followTag: 2,
  search: 0.5,
}

export interface UserAffinityProfile {
  byTag: Map<string, number>
  byAuthor: Map<string, number>
  byCollection: Map<string, number>
}

export function buildUserAffinityProfile(
  userId: string,
  events: ActivityEvent[],
  contentById: Map<string, Content>,
  nowMs: number,
  eventHalfLifeHours: number
): UserAffinityProfile {
  const byTag = new Map<string, number>()
  const byAuthor = new Map<string, number>()
  const byCollection = new Map<string, number>()

  for (const e of events) {
    if (e.userId !== userId) continue
    const base = e.weight ?? DEFAULT_EVENT_WEIGHTS[e.type]
    const age = nowMs - e.timestamp
    const decay = expHalfLifeDecay(age, eventHalfLifeHours)
    const w = base * decay

    if (e.knowledgeId) {
      const doc = contentById.get(e.knowledgeId)
      if (doc) {
        for (const tag of doc.tags) byTag.set(tag.id, (byTag.get(tag.id) ?? 0) + w)
        const authorId = doc.author.id
        byAuthor.set(authorId, (byAuthor.get(authorId) ?? 0) + w)
        const colId = doc.collection?.id
        if (colId) byCollection.set(colId, (byCollection.get(colId) ?? 0) + w)
      }
    }
    if (e.authorId) byAuthor.set(e.authorId, (byAuthor.get(e.authorId) ?? 0) + w)
    if (e.tagIds) for (const t of e.tagIds) byTag.set(t, (byTag.get(t) ?? 0) + w)
  }

  return { byTag, byAuthor, byCollection }
}

export interface PopularitySignals {
  byItem: Map<string, number>
}

export function computePopularitySignals(
  events: ActivityEvent[],
  nowMs: number,
  halfLifeHours: number
): PopularitySignals {
  const byItem = new Map<string, number>()
  for (const e of events) {
    if (!e.knowledgeId) continue
    const w = (e.weight ?? DEFAULT_EVENT_WEIGHTS[e.type]) * expHalfLifeDecay(nowMs - e.timestamp, halfLifeHours)
    byItem.set(e.knowledgeId, (byItem.get(e.knowledgeId) ?? 0) + w)
  }
  return { byItem }
}

