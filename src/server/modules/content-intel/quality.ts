import { QualityScore, ReadabilityMetrics } from './types'

export function computeQualitySignals(text: string, readability: ReadabilityMetrics, langConfidence: number): QualityScore {
  const lengthAdequacy = clamp(scale(text.length, 200, 5000)) // prefer >=200 chars, up to ~5k
  // Readability target: Flesch 50–70 sweet spot
  const readabilityScore = clamp(100 - Math.abs(60 - readability.fleschReadingEase))
  const repetitionPenalty = repetition(text)
  const structure = structureScore(text)
  const languageConfidence = Math.round(langConfidence * 100)

  const weights = { lengthAdequacy: 0.25, readability: 0.25, repetitionPenalty: 0.2, structure: 0.2, languageConfidence: 0.1 } as const
  const score = Math.round(
    lengthAdequacy * weights.lengthAdequacy +
    readabilityScore * weights.readability +
    repetitionPenalty * weights.repetitionPenalty +
    structure * weights.structure +
    languageConfidence * weights.languageConfidence
  )
  return {
    score,
    signals: { lengthAdequacy, readability: readabilityScore, repetitionPenalty, structure, languageConfidence }
  }
}

function repetition(text: string): number {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean)
  if (words.length === 0) return 100
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  const max = Math.max(...Array.from(freq.values()))
  // Penalize if one word dominates (>5% of words)
  const dominance = max / words.length
  const penalty = dominance > 0.05 ? Math.max(0, 100 - (dominance - 0.05) * 1000) : 100
  return Math.round(penalty)
}

function structureScore(text: string): number {
  // Reward presence of headings-like lines, lists, and paragraphs
  const lines = text.split(/\n+/)
  const hasHeadings = lines.some((l) => /^\s*#+\s+/.test(l) || /^\s*[A-Z][A-Za-z ]+:$/.test(l))
  const hasLists = /(^|\n)\s*[-*•]\s+/m.test(text)
  const paragraphs = lines.filter((l) => l.trim().length > 80).length
  let score = 50
  if (hasHeadings) score += 20
  if (hasLists) score += 15
  score += Math.min(15, paragraphs * 3)
  return Math.min(100, score)
}

function scale(value: number, min: number, max: number): number {
  if (value <= min) return Math.round((value / min) * 60)
  if (value >= max) return 100
  const ratio = (value - min) / (max - min)
  return Math.round(60 + ratio * 40)
}

function clamp(n: number): number { return Math.max(0, Math.min(100, n)) }

