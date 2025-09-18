import { LanguageCode, KeywordScore } from './types'
import { tokenize } from './tokenize'

export interface KeywordsOptions {
  max?: number
  language?: LanguageCode
  boostTitle?: string | null
}

export function extractKeywords(content: string, opts: KeywordsOptions = {}): KeywordScore[] {
  const lang = opts.language ?? 'en'
  const max = Math.max(1, opts.max ?? 10)
  const words = tokenize(content, lang)
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)

  // Simple 1-gram keywords. Could be extended with bigrams.
  const len = words.length || 1
  const titleBoost = (opts.boostTitle ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const boosted = new Set(titleBoost)

  const items: KeywordScore[] = Array.from(freq.entries()).map(([term, count]) => {
    // TF score normalized
    let score = count / len
    if (boosted.has(term)) score *= 2.0
    // Boost longer terms slightly
    if (term.length >= 8) score *= 1.2
    return { term, score }
  })

  items.sort((a, b) => b.score - a.score)
  return items.slice(0, max)
}

export function suggestTags(content: string, opts: { language?: LanguageCode; max?: number; existing?: string[]; title?: string } = {}): string[] {
  const kws = extractKeywords(content, { language: opts.language, max: (opts.max ?? 10) * 2, boostTitle: opts.title ?? null })
  const taken = new Set((opts.existing ?? []).map((t) => t.toLowerCase()))
  const tags: string[] = []
  for (const k of kws) {
    const candidate = k.term
    if (taken.has(candidate)) continue
    // Avoid too generic tokens — filtered by tokenizer stopwords already; also skip numbers-only
    if (/^\d+$/.test(candidate)) continue
    tags.push(candidate)
    if (tags.length >= (opts.max ?? 10)) break
  }
  return tags
}

