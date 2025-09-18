import type { Content, DuplicateSet } from './types'

// Lightweight MinHash for near-duplicate detection
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function shingles(words: string[], k = 5): string[] {
  const out: string[] = []
  for (let i = 0; i + k <= words.length; i++) out.push(words.slice(i, i + k).join(' '))
  return out
}

function hash32(str: string, seed: number): number {
  // xorshift-based simple hash; deterministic
  let h = seed | 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h << 13) | (h >>> 19)
    h = (h * 1597334677) | 0
  }
  return h >>> 0
}

function minhashSignature(tokens: string[], numHashes = 64): Uint32Array {
  const sig = new Uint32Array(numHashes)
  sig.fill(0xffffffff)
  for (let i = 0; i < numHashes; i++) {
    const seed = 2654435761 + i * 374761393
    for (const t of tokens) {
      const h = hash32(t, seed)
      const cur = typeof sig[i] === 'number' ? (sig[i] as number) : 0xffffffff
      if (h < cur) sig[i] = h
    }
  }
  return sig
}

function estJaccardFromSignatures(a: Uint32Array, b: Uint32Array): number {
  let same = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] === b[i]) same++
  return same / n
}

export function detectNearDuplicates(items: Content[], threshold = 0.85, shingleK = 3): DuplicateSet[] {
  const prepared = items.map((d) => {
    const text = `${d.title}\n${d.content}`
    const tokens = shingles(tokenize(text), shingleK)
    return { id: d.id, sig: minhashSignature(tokens, 128) }
  })

  // Union-Find to cluster
  const parent = new Map<string, string>()
  function find(x: string): string {
    const p = parent.get(x)
    if (!p || p === x) return x
    const r = find(p)
    parent.set(x, r)
    return r
  }
  function unite(a: string, b: string) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const a of prepared) parent.set(a.id, a.id)

  for (let i = 0; i < prepared.length; i++) {
    const ai = prepared[i]
    if (!ai) continue
    for (let j = i + 1; j < prepared.length; j++) {
      const bj = prepared[j]
      if (!bj) continue
      const sim = estJaccardFromSignatures(ai.sig, bj.sig)
      if (sim >= threshold) unite(ai.id, bj.id)
    }
  }

  const groups = new Map<string, string[]>()
  for (const p of prepared) {
    const r = find(p.id)
    const g = groups.get(r) ?? []
    g.push(p.id)
    groups.set(r, g)
  }

  const sets: DuplicateSet[] = []
  for (const [rep, ids] of groups.entries()) {
    if (ids.length <= 1) continue
    // Compute average similarity within the group for reporting
    let total = 0
    let count = 0
    const byId = new Map<string, Uint32Array>(prepared.map((x) => [x.id, x.sig]))
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const aId = ids[i]
        const bId = ids[j]
        if (!aId || !bId) continue
        const a = byId.get(aId)
        const b = byId.get(bId)
        if (!a || !b) continue
        total += estJaccardFromSignatures(a, b)
        count++
      }
    }
    const avg = count ? total / count : 1
    sets.push({ representativeId: rep, memberIds: ids, similarity: avg })
  }
  return sets
}
