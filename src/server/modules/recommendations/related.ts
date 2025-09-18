import type { Content, Scored } from './types'
import { cosine } from './similarity'

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
}

// Uses existing document.searchVector if present; otherwise falls back to lexical signature
export function relatedContent(items: Content[], seedId: string, max = 10): Scored<Content>[] {
  const byId = new Map(items.map((d) => [d.id, d]))
  const seed = byId.get(seedId)
  if (!seed) return []
  const out: Array<{ id: string; score: number }> = []
  for (const d of items) {
    if (d.id === seed.id) continue
    let s = 0
    if (seed.searchVector && d.searchVector) s = cosine(seed.searchVector, d.searchVector)
    else s = lexicalOverlap(seed, d)
    if (s > 0) out.push({ id: d.id, score: s })
  }
  out.sort((a, b) => b.score - a.score)
  return out.slice(0, max).map(({ id, score }) => ({ id, score, payload: byId.get(id)! }))
}

function lexicalOverlap(a: Content, b: Content): number {
  const at = new Set([a.title, a.excerpt ?? '', a.content].join(' ').toLowerCase().split(/\W+/).filter(Boolean))
  const bt = new Set([b.title, b.excerpt ?? '', b.content].join(' ').toLowerCase().split(/\W+/).filter(Boolean))
  const inter = [...at].filter((x) => bt.has(x)).length
  const denom = Math.sqrt(at.size) * Math.sqrt(bt.size)
  return denom === 0 ? 0 : inter / denom
}

