import { LanguageCode } from './types'
import { splitSentences, tokenize } from './tokenize'

export interface SummarizeOptions {
  maxSentences?: number
  language?: LanguageCode
}

export function summarize(content: string, opts: SummarizeOptions = {}): { summary: string; ranked: { index: number; score: number; text: string }[] } {
  const sentences = splitSentences(content)
  const lang = opts.language ?? 'en'
  if (sentences.length === 0) return { summary: '', ranked: [] }

  const tokens = sentences.map((s) => new Set(tokenize(s, lang)))
  // Build similarity matrix (cosine over token sets)
  const scores: number[] = Array(sentences.length).fill(0)
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const a = tokens[i]
      const b = tokens[j]
      const inter = intersectionSize(a, b)
      if (inter === 0) continue
      const sim = inter / Math.sqrt(a.size * b.size)
      scores[i] += sim
      scores[j] += sim
    }
  }
  // Rank sentences by score, preserve original order for ties
  const ranked = scores
    .map((score, index) => ({ index, score, text: sentences[index] }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))

  const maxN = Math.max(1, Math.min(opts.maxSentences ?? Math.ceil(Math.sqrt(sentences.length)), sentences.length))
  const top = ranked.slice(0, maxN).sort((a, b) => a.index - b.index)
  const summary = top.map((r) => r.text).join(' ')
  return { summary, ranked }
}

function intersectionSize<T>(a: Set<T>, b: Set<T>): number {
  let n = 0
  if (a.size > b.size) {
    for (const x of b) if (a.has(x)) n++
  } else {
    for (const x of a) if (b.has(x)) n++
  }
  return n
}

