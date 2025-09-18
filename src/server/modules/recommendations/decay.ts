export function expHalfLifeDecay(ageMs: number, halfLifeHours: number): number {
  if (halfLifeHours <= 0) return 1
  const halfLifeMs = halfLifeHours * 60 * 60 * 1000
  const lambda = Math.log(2) / halfLifeMs
  const v = Math.exp(-lambda * Math.max(0, ageMs))
  // Prevent denormals
  return Number.isFinite(v) ? v : 0
}

export function normalizeScores(scores: Map<string, number>): Map<string, number> {
  let max = 0
  for (const v of scores.values()) max = Math.max(max, v)
  if (max === 0) return scores
  const out = new Map<string, number>()
  for (const [k, v] of scores.entries()) out.set(k, v / max)
  return out
}

