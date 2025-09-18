import { SentimentResult } from './types'
import { tokenize } from './tokenize'

// Minimal AFINN-like lexicon (small subset for offline scoring)
const LEXICON = new Map<string, number>([
  ['good', 2],
  ['great', 3],
  ['excellent', 4],
  ['amazing', 4],
  ['positive', 2],
  ['beneficial', 2],
  ['happy', 2],
  ['love', 3],
  ['like', 1],
  ['success', 2],
  ['bad', -2],
  ['poor', -2],
  ['terrible', -3],
  ['awful', -3],
  ['horrible', -3],
  ['negative', -2],
  ['sad', -2],
  ['hate', -3],
  ['fail', -2],
  ['bug', -1],
])

export function sentiment(text: string): SentimentResult {
  const tokens = tokenize(text, 'en')
  let score = 0
  const positive: string[] = []
  const negative: string[] = []
  for (const t of tokens) {
    const s = LEXICON.get(t)
    if (typeof s === 'number') {
      score += s
      if (s > 0) positive.push(t)
      else if (s < 0) negative.push(t)
    }
  }
  const comparative = tokens.length ? score / tokens.length : 0
  return { score, comparative, positive, negative }
}

