import type { ActivityEvent, Content, RecommendationOptions, Scored } from './types'
import { buildUserAffinityProfile, computePopularitySignals } from './signals'
import { expHalfLifeDecay } from './decay'
import { buildItemSimilarityGraph, neighbors } from './similarity'

export interface PersonalizeParams {
  userId: string
  workspaceId: string
  items: Content[]
  events: ActivityEvent[]
  options?: RecommendationOptions
}

export function recommendForUser({ userId, workspaceId, items, events, options }: PersonalizeParams): Scored<Content>[] {
  const nowMs = options?.nowMs ?? Date.now()
  const eventHalfLife = options?.eventHalfLifeHours ?? 24 * 7 // 1 week
  const contentHalfLife = options?.contentHalfLifeHours ?? 24 * 14 // 2 weeks
  const maxResults = options?.maxResults ?? 20

  const catalog = items.filter((d) => d.workspaceId === workspaceId)
  const byId = new Map(catalog.map((d) => [d.id, d]))

  const profile = buildUserAffinityProfile(userId, events, byId, nowMs, eventHalfLife)
  const pop = computePopularitySignals(events.filter((e) => e.workspaceId === workspaceId), nowMs, eventHalfLife)

  // Precompute item neighbors for item-item CF fallback
  const edges = buildItemSimilarityGraph(catalog)
  const nbrs = neighbors(byId, edges)

  // Compute recency for items
  const itemRecency = new Map<string, number>()
  for (const d of catalog) {
    const age = nowMs - new Date(d.updatedAt).getTime()
    itemRecency.set(d.id, expHalfLifeDecay(age, contentHalfLife))
  }

  // Derive recent items user engaged with to expand neighborhood
  const recentByUser = new Set(
    events
      .filter((e) => e.userId === userId && e.workspaceId === workspaceId && e.knowledgeId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
      .map((e) => e.knowledgeId!)
  )

  const scored = new Map<string, { score: number; reasons: string[] }>()
  for (const d of catalog) {
    // Skip items the user has recently interacted with heavily
    if (recentByUser.has(d.id)) continue

    // Content-based: tag and author affinity
    let score = 0
    const reasons: string[] = []

    let tagScore = 0
    for (const t of d.tags) tagScore += profile.byTag.get(t.id) ?? 0
    if (tagScore > 0) {
      reasons.push('matches your interested tags')
      score += 0.5 * tagScore
    }

    const authorScore = profile.byAuthor.get(d.author.id) ?? 0
    if (authorScore > 0) {
      reasons.push('from authors you follow/engage with')
      score += 0.3 * authorScore
    }

    const colId = d.collection?.id
    const collectionScore = colId ? profile.byCollection.get(colId) ?? 0 : 0
    if (collectionScore > 0) {
      reasons.push('from collections you read')
      score += 0.15 * collectionScore
    }

    // Item-item: boost by neighbors of recent items
    let nbrBoost = 0
    for (const seed of recentByUser) {
      const list = nbrs.get(seed)
      if (!list) continue
      const hit = list.find((x) => x.id === d.id)
      if (hit) nbrBoost = Math.max(nbrBoost, hit.sim)
    }
    if (nbrBoost > 0) {
      reasons.push('similar to items you viewed')
      score += 0.25 * nbrBoost
    }

    // Popularity and recency
    const popScore = pop.byItem.get(d.id) ?? 0
    if (popScore > 0) score += 0.1 * popScore
    score += 0.2 * (itemRecency.get(d.id) ?? 0)

    if (score > 0) scored.set(d.id, { score, reasons })
  }

  const out: Scored<Content>[] = [...scored.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, maxResults)
    .map(([id, { score, reasons }]) => ({ id, score, reasons, payload: byId.get(id)! }))

  return out
}

