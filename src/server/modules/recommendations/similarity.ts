import type { Content } from './types'

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let dot = 0,
    na = 0,
    nb = 0
  for (let i = 0; i < n; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    dot += av * bv
    na += av * av
    nb += bv * bv
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export interface ItemSimilarityEdge {
  a: string
  b: string
  sim: number
  reason: 'tags' | 'author' | 'collection' | 'embedding'
}

export function buildItemSimilarityGraph(items: Content[]): ItemSimilarityEdge[] {
  const edges: ItemSimilarityEdge[] = []
  for (let i = 0; i < items.length; i++) {
    const A = items[i]
    if (!A) continue
    const aTags = new Set(A.tags.map((t) => t.id))
    for (let j = i + 1; j < items.length; j++) {
      const B = items[j]
      if (!B) continue
      // Prefer embedding cosine if both have vectors
      if (A.searchVector && B.searchVector) {
        const sim = cosine(A.searchVector, B.searchVector)
        if (sim > 0.2) edges.push({ a: A.id, b: B.id, sim, reason: 'embedding' })
        continue
      }
      const bTags = new Set(B.tags.map((t) => t.id))
      let maxSim = 0
      let reason: ItemSimilarityEdge['reason'] = 'tags'
      const tagSim = jaccard(aTags, bTags)
      maxSim = tagSim
      if (A.author.id === B.author.id) {
        maxSim = Math.max(maxSim, 0.6)
        reason = maxSim > tagSim ? 'author' : reason
      }
      if (A.collection?.id && B.collection?.id && A.collection.id === B.collection.id) {
        maxSim = Math.max(maxSim, 0.5)
        reason = maxSim >= tagSim ? 'collection' : reason
      }
      if (maxSim > 0) edges.push({ a: A.id, b: B.id, sim: maxSim, reason })
    }
  }
  return edges
}

export function neighbors(index: Map<string, Content>, edges: ItemSimilarityEdge[]): Map<string, Array<{ id: string; sim: number; reason: ItemSimilarityEdge['reason'] }>> {
  const map = new Map<string, Array<{ id: string; sim: number; reason: ItemSimilarityEdge['reason'] }>>()
  for (const e of edges) {
    if (!index.has(e.a) || !index.has(e.b)) continue
    const a = map.get(e.a) ?? []
    a.push({ id: e.b, sim: e.sim, reason: e.reason })
    map.set(e.a, a)
    const b = map.get(e.b) ?? []
    b.push({ id: e.a, sim: e.sim, reason: e.reason })
    map.set(e.b, b)
  }
  for (const [k, arr] of map) {
    arr.sort((x, y) => y.sim - x.sim)
    map.set(k, arr.slice(0, 50))
  }
  return map
}
